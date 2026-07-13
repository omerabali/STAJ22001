import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { EmbeddingService } from "../services/EmbeddingService.js";

/**
 * Validates the generated or retrieved vector to guarantee dimension and type integrity.
 * Raises detailed errors on failure.
 *
 * @param vector Float array representing the semantic embedding.
 */
export function validateEmbedding(vector: number[]): void {
  if (!vector || !Array.isArray(vector) || vector.length === 0) {
    throw new Error("[EmbeddingValidator] Embedding vector is empty or not an array.");
  }
  if (vector.length !== 1536) {
    throw new Error(`[EmbeddingValidator] Vektör boyutu hatalı. Beklenen: 1536, Gelen: ${vector.length}`);
  }
  if (vector.some(val => typeof val !== "number" || isNaN(val))) {
    throw new Error("[EmbeddingValidator] Vektör içinde geçersiz sayı veya NaN değeri tespit edildi.");
  }
}

/**
 * Iterates through all chunks of a CV and stores their embeddings in the database.
 * Supports dual cache layer:
 * 1. CV-level file hash lookup: copies embeddings from an identical CV hash.
 * 2. Chunk-level text lookup: copies vector if the exact text was embedded previously.
 *
 * @param cvId Unique ID of the target CV.
 * @param prisma PrismaClient instance.
 */
export async function embedAllChunks(
  cvId: string,
  prisma: PrismaClient
): Promise<{ embedded: number; copied: number; skipped: number; totalTimeMs: number }> {
  const startTime = Date.now();
  console.log(`[EmbeddingPipeline] Starting pipeline for CV: ${cvId}`);

  // 1. Fetch CV details and its chunks
  const cv = await prisma.cV.findUnique({
    where: { id: cvId },
    include: {
      chunks: {
        orderBy: { chunkIndex: "asc" }
      }
    }
  });

  if (!cv) {
    throw new Error(`[EmbeddingPipeline] CV not found with ID: ${cvId}`);
  }

  if (cv.chunks.length === 0) {
    console.log(`[EmbeddingPipeline] CV has no chunks to process. Skipping.`);
    return { embedded: 0, copied: 0, skipped: 0, totalTimeMs: Date.now() - startTime };
  }

  let embedded = 0;
  let copied = 0;
  let skipped = 0;

  // Pre-load CV-level cache map if another CV has the same hash and has embeddings
  const sourceChunksMap = new Map<number, { id: string }>();
  if (cv.hash) {
    const matchingCv = await prisma.cV.findFirst({
      where: {
        hash: cv.hash,
        id: { not: cvId },
        chunks: {
          some: {
            embeddings: { some: {} }
          }
        }
      },
      include: {
        chunks: {
          include: {
            embeddings: true
          },
          orderBy: { chunkIndex: "asc" }
        }
      }
    });

    if (matchingCv) {
      console.log(`[EmbeddingPipeline] Found matching CV hash: ${cv.hash} (${matchingCv.fileName}). Fetching copy maps.`);
      for (const sc of matchingCv.chunks) {
        if (sc.embeddings && sc.embeddings.length > 0) {
          sourceChunksMap.set(sc.chunkIndex, sc.embeddings[0]);
        }
      }
    }
  }

  // 2. Loop and embed chunks
  for (const chunk of cv.chunks) {
    const chunkStartTime = Date.now();
    let vector: number[] | null = null;
    let cacheSource: "file-hash" | "chunk-text" | "none" = "none";
    let originalEmbeddingId: string | null = null;

    // Check if embedding already exists for THIS specific chunk
    const alreadyExists = await prisma.cVEmbedding.findFirst({
      where: { chunkId: chunk.id }
    });

    if (alreadyExists) {
      skipped++;
      continue;
    }

    // ── Cache Seviyesi 1: CV-Level File Hash Copy ──
    if (sourceChunksMap.has(chunk.chunkIndex)) {
      const sourceEmbed = sourceChunksMap.get(chunk.chunkIndex)!;
      const rawVectorResult = await prisma.$queryRaw<{ embedding_text: string }[]>`
        SELECT embedding::text as embedding_text 
        FROM cv_embeddings 
        WHERE id = ${sourceEmbed.id} 
        LIMIT 1
      `;
      if (rawVectorResult[0]) {
        const cleanArr = rawVectorResult[0].embedding_text.replace(/[{}\[\]]/g, "").split(",");
        vector = cleanArr.map(v => parseFloat(v));
        cacheSource = "file-hash";
        originalEmbeddingId = sourceEmbed.id;
      }
    }

    // ── Cache Seviyesi 2: Chunk-Level Text Copy ──
    if (!vector) {
      const existingEmbed = await prisma.cVEmbedding.findFirst({
        where: {
          chunk: {
            chunkText: chunk.chunkText
          }
        },
        select: { id: true }
      });

      if (existingEmbed) {
        const rawVectorResult = await prisma.$queryRaw<{ embedding_text: string }[]>`
          SELECT embedding::text as embedding_text 
          FROM cv_embeddings 
          WHERE id = ${existingEmbed.id} 
          LIMIT 1
        `;
        if (rawVectorResult[0]) {
          const cleanArr = rawVectorResult[0].embedding_text.replace(/[{}\[\]]/g, "").split(",");
          vector = cleanArr.map(v => parseFloat(v));
          cacheSource = "chunk-text";
          originalEmbeddingId = existingEmbed.id;
        }
      }
    }

    // ── OpenAI API Entegrasyonu (Cache Miss) ──
    if (!vector) {
      try {
        vector = await EmbeddingService.generateEmbedding(chunk.chunkText, prisma);
        cacheSource = "none";
        embedded++;
      } catch (err: any) {
        console.error(`[EmbeddingPipeline] Failed to embed chunk ${chunk.id}:`, err);
        await prisma.cVChunk.update({
          where: { id: chunk.id },
          data: {
            metadata: {
              ...(chunk.metadata as any || {}),
              status: "FAILED",
              error: err.message || String(err)
            }
          }
        }).catch(updateErr => console.error(`[EmbeddingPipeline] Failed to update chunk metadata:`, updateErr));
        continue;
      }
    } else {
      copied++;
    }

    // Validate structure
    validateEmbedding(vector);

    // Save embedding using raw SQL insert
    const embedId = `embed-${crypto.randomUUID()}`;
    const vectorStr = `[${vector.join(",")}]`;
    const latency = Date.now() - chunkStartTime;
    const metadata = {
      cacheSource,
      latencyMs: latency,
      originalEmbeddingId,
      processedAt: new Date().toISOString()
    };

    await prisma.$executeRaw`
      INSERT INTO cv_embeddings (id, "chunkId", embedding, model, metadata, "createdAt")
      VALUES (${embedId}, ${chunk.id}, ${vectorStr}::vector, 'text-embedding-3-small', ${JSON.stringify(metadata)}::jsonb, NOW())
    `;
  }

  const duration = Date.now() - startTime;
  console.log(`[EmbeddingPipeline] Finished. Embedded: ${embedded}, Copied: ${copied}, Skipped: ${skipped}, Time: ${duration}ms`);

  return {
    embedded,
    copied,
    skipped,
    totalTimeMs: duration
  };
}

export async function searchSimilarChunks(
  queryText: string,
  limit: number,
  prisma: PrismaClient,
  cvId?: string,
  userId?: string  // Security: filter results to a specific user's CVs
): Promise<{ chunkId: string; chunkText: string; similarity: number; cvId: string }[]> {
  // 1. Generate query embedding
  const queryVector = await EmbeddingService.generateEmbedding(queryText, prisma);
  const queryVectorStr = `[${queryVector.join(",")}]`;

  // 2. Perform Cosine Similarity raw SQL query using '<=>' (cosine distance)
  // Cosine Similarity = 1 - Cosine Distance
  let matches: { chunkId: string; chunkText: string; similarity: number; cvId: string }[] = [];

  if (cvId) {
    matches = await prisma.$queryRaw<
      { chunkId: string; chunkText: string; similarity: number; cvId: string }[]
    >`
      SELECT 
        e."chunkId",
        c."chunkText",
        c."cvId",
        (1 - (e.embedding <=> ${queryVectorStr}::vector))::float as similarity
      FROM cv_embeddings e
      JOIN cv_chunks c ON e."chunkId" = c.id
      WHERE c."cvId" = ${cvId}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;
  } else {
    // Global search - scoped to userId if provided (security: users only see their own data)
    const rawMatches = userId
      ? await prisma.$queryRaw<
          { chunkId: string; chunkText: string; similarity: number; cvId: string }[]
        >`
          SELECT 
            e."chunkId",
            c."chunkText",
            c."cvId",
            (1 - (e.embedding <=> ${queryVectorStr}::vector))::float as similarity
          FROM cv_embeddings e
          JOIN cv_chunks c ON e."chunkId" = c.id
          JOIN cvs ON c."cvId" = cvs.id
          WHERE cvs."userId" = ${userId}
          ORDER BY similarity DESC
          LIMIT ${limit * 3}
        `
      : await prisma.$queryRaw<
          { chunkId: string; chunkText: string; similarity: number; cvId: string }[]
        >`
          SELECT 
            e."chunkId",
            c."chunkText",
            c."cvId",
            (1 - (e.embedding <=> ${queryVectorStr}::vector))::float as similarity
          FROM cv_embeddings e
          JOIN cv_chunks c ON e."chunkId" = c.id
          ORDER BY similarity DESC
          LIMIT ${limit * 3}
        `;

    // Filter by unique chunkText
    const seen = new Set<string>();
    for (const match of rawMatches) {
      if (!seen.has(match.chunkText)) {
        seen.add(match.chunkText);
        matches.push(match);
        if (matches.length >= limit) {
          break;
        }
      }
    }
  }

  return matches;
}

// Local cache Map for in-memory caching
const inMemoryCache = new Map<string, number[]>();

/**
 * Computes SHA-256 hash of a string.
 */
export function computeHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Clears the in-memory cache.
 */
export function clearInMemoryCache(): void {
  inMemoryCache.clear();
}

/**
 * In-memory pipeline that converts text chunks into embeddings.
 * Uses a SHA-256 hash cache on local Map to avoid duplicate API calls.
 */
export async function embedAllChunksInMemory(
  chunks: string[],
  prisma?: any
): Promise<{ embedded: number; copied: number; skipped: number }> {
  let embedded = 0;
  let copied = 0;

  for (const text of chunks) {
    const hash = computeHash(text);
    if (inMemoryCache.has(hash)) {
      copied++;
    } else {
      const vector = await EmbeddingService.generateEmbedding(text, prisma);
      validateEmbedding(vector);
      inMemoryCache.set(hash, vector);
      embedded++;
    }
  }

  return {
    embedded,
    copied,
    skipped: 0
  };
}

/**
 * Performs Cosine Similarity raw SQL query over cv_embeddings to find matching CVs.
 * Uses a CTE to first get the top 300 chunks to avoid scanning/grouping the entire database.
 * Partitions by cv.id to return unique CVs with their highest matching chunk score (MAX) and matchedChunkId.
 * Similarity threshold is read from environment variable SIMILARITY_THRESHOLD (default: 0.30).
 *
 * @param queryText Search query metni
 * @param limit Maksimum getirilecek CV sayısı
 * @param prisma PrismaClient instance
 */
export async function searchSimilarCVs(
  queryText: string,
  limit: number,
  prisma: PrismaClient
): Promise<{ cvId: string; candidateName: string | null; candidateEmail: string | null; score: number; matchedChunkId: string }[]> {
  const queryVector = await EmbeddingService.generateEmbedding(queryText, prisma);
  const queryVectorStr = `[${queryVector.join(",")}]`;

  // Read threshold from environment variables (default: 0.30)
  const threshold = parseFloat(process.env.SIMILARITY_THRESHOLD || "0.30");

  const matches = await prisma.$queryRaw<
    { cvId: string; candidateName: string | null; candidateEmail: string | null; score: number; matchedChunkId: string }[]
  >`
    WITH similarity_scores AS (
      SELECT 
        c."cvId",
        c.id as "chunkId",
        u.name as "candidateName",
        u.email as "candidateEmail",
        (1 - (e.embedding <=> ${queryVectorStr}::vector))::float as similarity
      FROM cv_embeddings e
      JOIN cv_chunks c ON e."chunkId" = c.id
      JOIN cvs cv ON c."cvId" = cv.id
      LEFT JOIN users u ON cv."userId" = u.id
      ORDER BY similarity DESC
      LIMIT 300
    ),
    ranked_chunks AS (
      SELECT 
        "cvId",
        "chunkId" as "matchedChunkId",
        "candidateName",
        "candidateEmail",
        similarity as score,
        ROW_NUMBER() OVER(PARTITION BY "cvId" ORDER BY similarity DESC) as rn
      FROM similarity_scores
      WHERE similarity > ${threshold}
    )
    SELECT 
      "cvId",
      "matchedChunkId",
      "candidateName",
      "candidateEmail",
      score
    FROM ranked_chunks
    WHERE rn = 1
    ORDER BY score DESC
    LIMIT ${limit}
  `;

  return matches;
}



