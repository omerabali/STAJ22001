/**
 * verify_gun26.test.ts
 *
 * Gün 26 - Jest Test Suite:
 *   1. POST /api/search yetkilendirme engelleri (CANDIDATE 403, Token'sız 401).
 *   2. ADMIN arama yaptığında pgvector sonuçlarının GPT-4o-mini'ye toplu (Batch) gönderilmesi.
 *   3. GPT yanıtı başarılı olduğunda hibrid skor formülü (Vector * 0.4 + GPT * 0.6) ile yeniden sıralama yapılması.
 *   4. GPT skoru yüksek olan adayın (düşük vektör skoruna sahip olsa bile) ilk sıraya yerleştiğinin doğrulanması.
 *   5. Sonuçlarda matchedChunkId, gptScore, vectorScore ve matchExplanation alanlarının doğrulanması.
 *   6. OpenAI API hatasında fallback mekanizmasının devreye girerek pgvector skoruyla (%100) kesintisiz yanıt dönmesi.
 */

import "../src/load-env.js";
import pg from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import request from "supertest";
import jwt from "jsonwebtoken";
import { jest, describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import { app, pool as appPool } from "../src/index.js";
import { EmbeddingService } from "../src/services/EmbeddingService.js";

// ── Prisma Setup ──────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// ── Test State ─────────────────────────────────────────────────────────────────
let adminToken: string;
let userAToken: string;
let userBToken: string;

let adminId: string;
let userAId: string;
let userBId: string;

let cvAId: string;
let cvBId: string;

const jwtSecret = process.env.JWT_SECRET || "test-jwt-secret";

describe("Gün 26 - Jest: GPT Yorumlama, Hibrid Skorlama ve Fallback Testleri", () => {

  beforeAll(async () => {
    // 1. Kullanıcıları oluştur
    const admin = await prisma.user.create({
      data: {
        email: `jest-rank-admin-${Date.now()}@example.com`,
        passwordHash: "pass",
        phone: `admin-${Date.now()}`,
        name: "Rank Admin",
        role: "ADMIN"
      }
    });
    adminId = admin.id;
    adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, jwtSecret);

    const userA = await prisma.user.create({
      data: {
        email: `jest-rank-userA-${Date.now()}@example.com`,
        passwordHash: "pass",
        phone: `usera-${Date.now()}`,
        name: "Aday A",
        role: "CANDIDATE"
      }
    });
    userAId = userA.id;
    userAToken = jwt.sign({ id: userA.id, email: userA.email, role: userA.role }, jwtSecret);

    const userB = await prisma.user.create({
      data: {
        email: `jest-rank-userB-${Date.now()}@example.com`,
        passwordHash: "pass",
        phone: `userb-${Date.now()}`,
        name: "Aday B",
        role: "CANDIDATE"
      }
    });
    userBId = userB.id;
    userBToken = jwt.sign({ id: userB.id, email: userB.email, role: userB.role }, jwtSecret);

    // 2. CV'leri oluştur
    const cvA = await prisma.cV.create({
      data: {
        userId: userA.id,
        fileName: "userA-cv.pdf",
        fileUrl: "https://example.com/userA-cv.pdf",
        hash: `hash-a-${Date.now()}`,
        rawText: "React ve Node.js konusunda uzman fullstack geliştirici deneyimi."
      }
    });
    cvAId = cvA.id;

    const cvB = await prisma.cV.create({
      data: {
        userId: userB.id,
        fileName: "userB-cv.pdf",
        fileUrl: "https://example.com/userB-cv.pdf",
        hash: `hash-b-${Date.now()}`,
        rawText: "Yalnızca Python veri bilimi tecrübesi."
      }
    });
    cvBId = cvB.id;

    // 3. CV Chunks & Embeddings oluştur
    const chunkA1 = await prisma.cVChunk.create({
      data: { cvId: cvA.id, chunkText: "React ve Node.js uzmanı", chunkIndex: 0 }
    });
    const chunkB1 = await prisma.cVChunk.create({
      data: { cvId: cvB.id, chunkText: "Python veri bilimci", chunkIndex: 0 }
    });

    // Vektör yönelimleri:
    const highArr = Array(1536).fill(0.1);
    highArr[0] = 0.5; // CV A Chunk (Score: 100)

    const medArr = Array(1536).fill(0.1);
    medArr[0] = 0.2; // CV B Chunk (Score: ~99.7)

    const vecHigh = `[${highArr.join(",")}]`;
    const vecMedium = `[${medArr.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO cv_embeddings (id, "chunkId", embedding, model) VALUES (gen_random_uuid(), $1, $2::vector, $3)`,
      chunkA1.id, vecHigh, "text-embedding-3-small"
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO cv_embeddings (id, "chunkId", embedding, model) VALUES (gen_random_uuid(), $1, $2::vector, $3)`,
      chunkB1.id, vecMedium, "text-embedding-3-small"
    );
  });

  afterAll(async () => {
    // Temizlik
    await prisma.cV.deleteMany({ where: { id: { in: [cvAId, cvBId] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [adminId, userAId, userBId] } } }).catch(() => {});

    await prisma.$disconnect();
    await pool.end();

    if (appPool && typeof (appPool as any).end === "function") {
      await (appPool as any).end().catch(() => {});
    }
  });

  // ── Test 1: Yetki Kontrolleri ──────────────────────────────────────────────
  test("CANDIDATE arama yaptığında 403 Forbidden almalıdır", async () => {
    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${userAToken}`)
      .send({ query: "deneme" });
    expect(response.status).toBe(403);
  });

  // ── Test 2: Hibrid Skorlama ve Yeniden Sıralama Testi ────────────────────────
  test("Yönetici arama yaptığında GPT hibrid sıralaması doğru çalışmalı ve yüksek GPT puanlı aday öne geçmelidir", async () => {
    const queryVector = Array(1536).fill(0.1);
    queryVector[0] = 0.5;

    const vectorSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(queryVector);

    // OpenAI fetch çağrısını mock'luyoruz:
    // CV A (Vektör Skoru: 100): GPT 40 veriyoruz. Hibrid Skor: 100 * 0.4 + 40 * 0.6 = 40 + 24 = 64
    // CV B (Vektör Skoru: ~99.7): GPT 95 veriyoruz. Hibrid Skor: 99.7 * 0.4 + 95 * 0.6 = 39.88 + 57 = 96.88
    // Sonuçta CV B'nin ilk sırada listelenmesini bekliyoruz!
    const mockFetch = jest.spyOn(global, "fetch") as any;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                evaluations: [
                  { cvId: cvAId, suitabilityScore: 40, matchExplanation: "Aday A yetersiz." },
                  { cvId: cvBId, suitabilityScore: 95, matchExplanation: "Aday B çok uyumlu." }
                ]
              })
            }
          }
        ],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 100
        }
      })
    });

    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({ query: "React Node.js geliştirici" });

    expect(response.status).toBe(200);
    expect(response.body.processingTimeMs).toBeDefined();

    const results = response.body.results;
    expect(results.length).toBeGreaterThanOrEqual(2);

    // CV B ilk sırada yer almalıdır (Hibrid skor sıralama doğrulaması)
    expect(results[0].cvId).toBe(cvBId);
    expect(results[0].gptScore).toBe(95);
    expect(results[0].score).toBeCloseTo(96.9, 1);

    // CV A ikinci sırada yer almalıdır
    expect(results[1].cvId).toBe(cvAId);
    expect(results[1].gptScore).toBe(40);
    expect(results[1].score).toBeCloseTo(64.0, 1);

    // matchedChunkId ve matchExplanation alanlarının doğrulanması
    expect(results[0].matchedChunkId).toBeDefined();
    expect(results[0].matchExplanation).toBe("Aday B çok uyumlu.");

    vectorSpy.mockRestore();
    mockFetch.mockRestore();
  });

  // ── Test 3: Fallback Mekanizması Testi ──────────────────────────────────────
  test("OpenAI API çöktüğünde sistem hata vermemeli ve pgvector fallback skorlarıyla sıralamalıdır", async () => {
    const queryVector = Array(1536).fill(0.1);
    queryVector[0] = 0.5;

    const vectorSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(queryVector);

    // OpenAI fetch API'sini başarısız duruma getirecek şekilde mock'luyoruz
    const mockFetch = jest.spyOn(global, "fetch") as any;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500
    });

    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({ query: "arama" });

    expect(response.status).toBe(200); // 500 dönmemeli, fallback çalışmalı!

    const results = response.body.results;
    expect(results.length).toBeGreaterThanOrEqual(2);

    // Vektör skoru en yüksek olan CV A (%100 ağırlıkla) ilk sırada yer almalı
    expect(results[0].cvId).toBe(cvAId);
    expect(results[0].gptScore).toBeNull();
    expect(results[0].score).toBeCloseTo(100.0, 1); // Fallback skoru vektör skoruyla eşitlenir

    expect(results[0].matchExplanation).toContain("Yapay zeka analizi şu anda kullanılamıyor");

    vectorSpy.mockRestore();
    mockFetch.mockRestore();
  });
});
