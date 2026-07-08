import crypto from "crypto";
import { EmbeddingService } from "../services/EmbeddingService.js";

// In-memory cache to store SHA-256 hashes of chunks mapped to their 1536-dimensional vectors
const inMemoryCache = new Map<string, number[]>();

/**
 * Helper to compute SHA-256 hash of a string.
 *
 * @param text Input text.
 * @returns SHA-256 hex string.
 */
export function computeHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

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
 * Clears the local in-memory cache. Used mainly for testing.
 */
export function clearInMemoryCache(): void {
  inMemoryCache.clear();
}

/**
 * In-Memory Pipeline:
 * Iterates through all chunk texts, computes hashes, and manages in-memory caching.
 * Bypasses database operations entirely.
 *
 * @param chunks List of text chunks from the CV.
 * @returns Embeddings list with caching metadata.
 */
export async function embedAllChunksInMemory(
  chunks: string[]
): Promise<{
  results: { text: string; hash: string; vector: number[]; cacheSource: "memory" | "none" }[];
  embedded: number;
  copied: number;
  totalTimeMs: number;
}> {
  const startTime = Date.now();
  const results: { text: string; hash: string; vector: number[]; cacheSource: "memory" | "none" }[] = [];
  let embedded = 0;
  let copied = 0;

  for (const text of chunks) {
    if (!text || text.trim().length === 0) {
      continue;
    }

    const hash = computeHash(text);
    let vector: number[] | undefined;
    let cacheSource: "memory" | "none" = "none";

    // ── Cache Layer: In-Memory SHA-256 Hash Matching ──
    if (inMemoryCache.has(hash)) {
      vector = inMemoryCache.get(hash)!;
      cacheSource = "memory";
      copied++;
    } else {
      // ── OpenAI API call (Cache Miss) ──
      vector = await EmbeddingService.generateEmbedding(text);
      cacheSource = "none";
      embedded++;

      // Store in memory cache
      inMemoryCache.set(hash, vector);
    }

    // Validate size & integrity
    validateEmbedding(vector);

    results.push({
      text,
      hash,
      vector,
      cacheSource,
    });
  }

  const duration = Date.now() - startTime;
  return {
    results,
    embedded,
    copied,
    totalTimeMs: duration,
  };
}
