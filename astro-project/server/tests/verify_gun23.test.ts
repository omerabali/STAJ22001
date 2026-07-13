import "../src/load-env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import crypto from "crypto";
import request from "supertest";
import jwt from "jsonwebtoken";
import { jest, describe, test, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import { app, pool as appPool } from "../src/index.js";
import { supabase } from "../src/lib/supabase.js";
import { EmbeddingService } from "../src/services/EmbeddingService.js";
import { 
  embedAllChunks, 
  searchSimilarChunks, 
  computeHash 
} from "../src/utils/embeddings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Prisma
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

describe("Gün 23 - Jest: Embedding Pipeline, Önbellek ve E2E HTTP Testleri", () => {
  let tempUser1: any = null;
  let tempUser2: any = null;
  let token1: string = "";
  let token2: string = "";
  let fileBuffer: Buffer;
  let fileHash: string;
  const tempCvIds: string[] = [];
  let apiSpy: any;

  beforeAll(async () => {
    // Check vector extension and setup index
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector;");
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS cv_embeddings_hnsw_idx 
      ON cv_embeddings 
      USING hnsw (embedding vector_cosine_ops);
    `);

    // Create unique test users
    const uniqueSuffix = Date.now();
    tempUser1 = await prisma.user.create({
      data: {
        email: `jest-user-1-${uniqueSuffix}@example.com`,
        passwordHash: "temp-pass-1",
        phone: `5551111${Math.floor(100 + Math.random() * 900)}`,
        name: "Jest User 1",
        role: "CANDIDATE"
      }
    });

    tempUser2 = await prisma.user.create({
      data: {
        email: `jest-user-2-${uniqueSuffix}@example.com`,
        passwordHash: "temp-pass-2",
        phone: `5552222${Math.floor(100 + Math.random() * 900)}`,
        name: "Jest User 2",
        role: "CANDIDATE"
      }
    });

    const jwtSecret = process.env.JWT_SECRET || "test-jwt-secret";
    token1 = jwt.sign({ id: tempUser1.id, email: tempUser1.email, role: tempUser1.role }, jwtSecret);
    token2 = jwt.sign({ id: tempUser2.id, email: tempUser2.email, role: tempUser2.role }, jwtSecret);



    // Enable RLS and create policy for cv_embeddings
    const rlsSql = `
      ALTER TABLE cv_embeddings ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Users can only access their own embeddings" ON cv_embeddings;
      CREATE POLICY "Users can only access their own embeddings" ON cv_embeddings
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM cv_chunks
            JOIN cvs ON cv_chunks."cvId" = cvs.id
            WHERE cv_embeddings."chunkId" = cv_chunks.id
              AND cvs."userId" = auth.uid()
          )
        );
    `;
    await prisma.$executeRawUnsafe(rlsSql).catch((err) => {
      console.warn("[Test] Failed to apply RLS policy:", err.message);
    });

    // Load PDF file
    const pdfPath = path.resolve(__dirname, "fixtures/test_cv.pdf");
    expect(fs.existsSync(pdfPath)).toBe(true);
    fileBuffer = fs.readFileSync(pdfPath);
    fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Spy and mock generateEmbedding by default to prevent real API requests during E2E tests
    apiSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockImplementation(async () => Array(1536).fill(0.1));
  });

  beforeEach(() => {
    // Clear mock calls to avoid leakage across tests
    apiSpy.mockClear();
  });

  afterAll(async () => {
    // Restore spy
    apiSpy.mockRestore();

    // Delete all CVs generated during tests and clean up Supabase Storage
    for (const cvId of tempCvIds) {
      const cv = await prisma.cV.findUnique({ where: { id: cvId } });
      if (cv) {
        // Parse filePath from publicUrl
        const oldFilePath = cv.fileUrl.split("/public/cv-files/")[1];
        if (oldFilePath) {
          await supabase.storage.from("cv-files").remove([oldFilePath]).catch(() => {});
        }
        await prisma.cV.delete({ where: { id: cvId } }).catch(() => {});
      }
    }

    // Delete test users
    if (tempUser1) {
      await prisma.user.delete({ where: { id: tempUser1.id } }).catch(() => {});
    }
    if (tempUser2) {
      await prisma.user.delete({ where: { id: tempUser2.id } }).catch(() => {});
    }

    // Close connection pools cleanly
    await pool.end();
    await appPool.end();
  });

  // ── 1. Birim (Unit) Testleri ────────────────────────────────────────────────
  test("computeHash() aynı girdi için aynı SHA-256 hash'i dönmelidir", () => {
    const input = "Kırklareli Üniversitesi";
    const hash1 = computeHash(input);
    const hash2 = computeHash(input);
    expect(hash1).toBe(hash2);
    expect(hash1).toBe(crypto.createHash("sha256").update(input).digest("hex"));
  });

  test("searchSimilarChunks() cosine similarity sıralamasını doğru döndürmelidir", async () => {
    // Mock OpenAI generateEmbedding call
    const mockVector = Array(1536).fill(0.1);
    apiSpy.mockResolvedValueOnce(mockVector);

    const results = await searchSimilarChunks("test query", 3, prisma);
    
    // Results must be sorted by similarity in descending order
    if (results.length > 1) {
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].similarity).toBeGreaterThanOrEqual(results[i + 1].similarity);
      }
    }
  });

  test("OpenAI hata döndürdüğünde embedAllChunks() chunk'ı FAILED işaretleyip devam etmelidir (Gün 24 graceful handling)", async () => {
    const tempCv = await prisma.cV.create({
      data: {
        userId: tempUser1.id,
        fileName: "error_test.pdf",
        fileUrl: "https://example.com/error_test.pdf",
        hash: `random-hash-error-${Date.now()}-${Math.random()}`
      }
    });
    tempCvIds.push(tempCv.id);

    const failChunk = await prisma.cVChunk.create({
      data: {
        cvId: tempCv.id,
        chunkText: "some test text chunk error",
        chunkIndex: 1
      }
    });

    // Mock generateEmbedding to fail once
    apiSpy.mockRejectedValueOnce(new Error("OpenAI Rate Limit Exceeded"));

    // Gün 24 davranışı: hata fırlatmaz, chunk'ı FAILED işaretler ve devam eder
    const result = await embedAllChunks(tempCv.id, prisma);

    // Pipeline RESOLVE olmalı (throw değil)
    expect(result).toBeDefined();
    expect(result.embedded).toBe(0); // Başarılı embed yok
    expect(result.copied).toBe(0);

    // Chunk'ın metadata'sında status: FAILED yazılmış olmalı
    const updatedChunk = await prisma.cVChunk.findUnique({ where: { id: failChunk.id } });
    const meta = updatedChunk?.metadata as any;
    expect(meta?.status).toBe("FAILED");
    expect(meta?.error).toContain("OpenAI Rate Limit Exceeded");
  });

  test("embedAllChunks() normal başarı akışı için izole unit test çalışmalıdır (Mocked OpenAI)", async () => {
    const tempCv = await prisma.cV.create({
      data: {
        userId: tempUser1.id,
        fileName: "mock_success_test.pdf",
        fileUrl: "https://example.com/mock_success_test.pdf",
        hash: `random-hash-mock-success-${Date.now()}-${Math.random()}`
      }
    });
    tempCvIds.push(tempCv.id);

    await prisma.cVChunk.create({
      data: {
        cvId: tempCv.id,
        chunkText: "mock success text chunk",
        chunkIndex: 1
      }
    });

    const mockVector = Array(1536).fill(0.25);
    apiSpy.mockResolvedValueOnce(mockVector);

    const result = await embedAllChunks(tempCv.id, prisma);
    expect(result.embedded).toBe(1);
    expect(result.copied).toBe(0);

    const savedEmbed = await prisma.cVEmbedding.count({
      where: { chunk: { cvId: tempCv.id } }
    });
    expect(savedEmbed).toBe(1);
  });

  // ── 2. Uçtan Uca (E2E) Pipeline ve Önbellek Testleri ──────────────────────────
  test("E2E: CV Yükleme endpoint'i (/api/cv/upload) çalışmalı ve PENDING -> PROCESSING -> COMPLETED geçişini yapmalıdır (Cache Miss)", async () => {
    const response = await request(app)
      .post("/api/cv/upload")
      .set("Cookie", `token=${token1}`)
      .attach("cv", fileBuffer, "test_cv.pdf");

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("CV başarıyla yüklendi, analiz sıraya alındı.");
    expect(response.body.cv).toBeDefined();
    expect(response.body.analysis).toBeDefined();

    const cvId = response.body.cv.id;
    const analysisId = response.body.analysis.id;
    tempCvIds.push(cvId);

    // Polling database to check PENDING -> PROCESSING -> COMPLETED transitions
    let status = "PENDING";
    const startTime = Date.now();
    
    while (status === "PENDING" || status === "PROCESSING") {
      if (Date.now() - startTime > 25000) {
        throw new Error("[Test] Background CV processing timed out (exceeded 25s).");
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      const current = await prisma.cVAnalysis.findUnique({
        where: { id: analysisId }
      });
      status = current?.status || "FAILED";
    }

    expect(status).toBe("COMPLETED");

    // Verify DB count
    const chunksCount = await prisma.cVChunk.count({ where: { cvId } });
    expect(chunksCount).toBeGreaterThan(0);

    const embeddingsCount = await prisma.cVEmbedding.count({
      where: { chunk: { cvId } }
    });
    expect(embeddingsCount).toBe(chunksCount);
  });

  test("E2E Cache: Farklı kullanıcı aynı CV dosyasını yüklediğinde 0 yeni OpenAI isteği yapmalıdır (Cross-User Cache Hit)", async () => {
    const response = await request(app)
      .post("/api/cv/upload")
      .set("Cookie", `token=${token2}`) // User 2
      .attach("cv", fileBuffer, "test_cv.pdf");

    expect(response.status).toBe(201);
    const cvId = response.body.cv.id;
    const analysisId = response.body.analysis.id;
    tempCvIds.push(cvId);

    // Wait for completed analysis status
    let status = "PENDING";
    const startTime = Date.now();
    while (status === "PENDING" || status === "PROCESSING") {
      if (Date.now() - startTime > 25000) {
        throw new Error("[Test] E2E cross-user cache pipeline timed out.");
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      const current = await prisma.cVAnalysis.findUnique({
        where: { id: analysisId }
      });
      status = current?.status || "FAILED";
    }

    expect(status).toBe("COMPLETED");

    // OpenAI API calls must be exactly 0
    expect(apiSpy).toHaveBeenCalledTimes(0);
  });

  test("E2E Cache: Aynı kullanıcı aynı dosyayı tekrar yüklediğinde (eski CV silinse bile) 0 yeni OpenAI isteği yapmalıdır (Same-User Cache Hit via Cross-CV Cache)", async () => {
    // Bu testte User 1 tekrar yüklüyor. Kendi eski CV'si siliniyor ama User 2'nin CV'si DB'de olduğu için önbellekten kopyalanacak.
    const response = await request(app)
      .post("/api/cv/upload")
      .set("Cookie", `token=${token1}`)
      .attach("cv", fileBuffer, "test_cv.pdf");

    expect(response.status).toBe(201);
    const cvId = response.body.cv.id;
    const analysisId = response.body.analysis.id;
    tempCvIds.push(cvId);

    // Wait for completed analysis status
    let status = "PENDING";
    const startTime = Date.now();
    while (status === "PENDING" || status === "PROCESSING") {
      if (Date.now() - startTime > 25000) {
        throw new Error("[Test] E2E same-user cache pipeline timed out.");
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      const current = await prisma.cVAnalysis.findUnique({
        where: { id: analysisId }
      });
      status = current?.status || "FAILED";
    }

    expect(status).toBe("COMPLETED");

    // OpenAI API calls must be exactly 0
    expect(apiSpy).toHaveBeenCalledTimes(0);
  });
});
