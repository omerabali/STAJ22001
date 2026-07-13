/**
 * verify_gun25.test.ts
 *
 * Gün 25 - Jest Test Suite:
 *   1. POST /api/search eksik veya hatalı body gönderildiğinde 400 Bad Request dönmelidir.
 *   2. POST /api/search yetkisiz (token'sız) çağrıldığında 401/403 Unauthorized dönmelidir.
 *   3. CANDIDATE arama yaptığında sadece kendi CV'sini görebilmelidir (Kullanıcı İzolasyonu).
 *   4. ADMIN arama yaptığında sistemdeki tüm CV'ler arasında arama yapabilmelidir.
 *   5. Çoklu chunk durumunda CV skoru en yüksek benzerlik skoru (MAX) olmalı ve azalan sırada gelmelidir.
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

describe("Gün 25 - Jest: POST /api/search Semantik Arama ve İzolasyon Testleri", () => {

  beforeAll(async () => {
    // 1. Kullanıcıları oluştur
    const admin = await prisma.user.create({
      data: {
        email: `jest-search-admin-${Date.now()}@example.com`,
        passwordHash: "pass",
        phone: `admin-${Date.now()}`,
        name: "Search Admin",
        role: "ADMIN"
      }
    });
    adminId = admin.id;
    adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, jwtSecret);

    const userA = await prisma.user.create({
      data: {
        email: `jest-search-userA-${Date.now()}@example.com`,
        passwordHash: "pass",
        phone: `usera-${Date.now()}`,
        name: "Search Candidate A",
        role: "CANDIDATE"
      }
    });
    userAId = userA.id;
    userAToken = jwt.sign({ id: userA.id, email: userA.email, role: userA.role }, jwtSecret);

    const userB = await prisma.user.create({
      data: {
        email: `jest-search-userB-${Date.now()}@example.com`,
        passwordHash: "pass",
        phone: `userb-${Date.now()}`,
        name: "Search Candidate B",
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
        hash: `hash-a-${Date.now()}`
      }
    });
    cvAId = cvA.id;

    const cvB = await prisma.cV.create({
      data: {
        userId: userB.id,
        fileName: "userB-cv.pdf",
        fileUrl: "https://example.com/userB-cv.pdf",
        hash: `hash-b-${Date.now()}`
      }
    });
    cvBId = cvB.id;

    // 3. CV Chunks & Embeddings oluştur (Grup-by MAX skoru doğrulamak için çoklu parça ekliyoruz)
    // CV A - Chunk 1
    const chunkA1 = await prisma.cVChunk.create({
      data: { cvId: cvA.id, chunkText: "User A chunk 1 text", chunkIndex: 0 }
    });
    // CV A - Chunk 2
    const chunkA2 = await prisma.cVChunk.create({
      data: { cvId: cvA.id, chunkText: "User A chunk 2 text", chunkIndex: 1 }
    });

    // CV B - Chunk 1
    const chunkB1 = await prisma.cVChunk.create({
      data: { cvId: cvB.id, chunkText: "User B chunk 1 text", chunkIndex: 0 }
    });

    // Vektörleri doğrudan veritabanına yazıyoruz.
    // Query vektörümüzü [0.1, 0.1, ...] olarak mocklayacağız.
    // CV A Chunk 1: [0.1, 0.1, ...] -> Cosine Similarity = 1.0 (Skor: 1.0)
    // CV A Chunk 2: [0.9, 0.9, ...] -> Cosine Similarity daha düşük (Skor: ~0.1)
    // CV B Chunk 1: [0.2, 0.2, ...] -> Cosine Similarity = ~0.95 (Skor: ~0.95)

    // Vektörlerin cosine similarity hesaplamasında 1.0 (aynı yön) çıkmaması için
    // sabit (flat) vektörler yerine yönleri farklı non-constant diziler kullanıyoruz.
    const highArr = Array(1536).fill(0.1);
    highArr[0] = 0.5; // Referans arama yönümüz (Score: 1.0)

    const lowArr = Array(1536).fill(0.1);
    lowArr[0] = -0.5; // Zıt yönde (Düşük benzerlik)

    const medArr = Array(1536).fill(0.1);
    medArr[0] = 0.2; // Yakın ama farklı yönde (Score: ~0.95)

    const vecHigh = `[${highArr.join(",")}]`;
    const vecLow = `[${lowArr.join(",")}]`;
    const vecMedium = `[${medArr.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO cv_embeddings (id, "chunkId", embedding, model) VALUES (gen_random_uuid(), $1, $2::vector, $3)`,
      chunkA1.id, vecHigh, "text-embedding-3-small"
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO cv_embeddings (id, "chunkId", embedding, model) VALUES (gen_random_uuid(), $1, $2::vector, $3)`,
      chunkA2.id, vecLow, "text-embedding-3-small"
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO cv_embeddings (id, "chunkId", embedding, model) VALUES (gen_random_uuid(), $1, $2::vector, $3)`,
      chunkB1.id, vecMedium, "text-embedding-3-small"
    );
  });

  afterAll(async () => {
    // Temizlik adımları
    await prisma.cV.deleteMany({ where: { id: { in: [cvAId, cvBId] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [adminId, userAId, userBId] } } }).catch(() => {});

    await prisma.$disconnect();
    await pool.end();

    if (appPool && typeof (appPool as any).end === "function") {
      await (appPool as any).end().catch(() => {});
    }
  });

  // ── Test 1: Giriş Validasyonu ──────────────────────────────────────────────
  test("POST /api/search eksik veya hatalı body durumunda 400 dönmelidir", async () => {
    const responseEmpty = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({});
    expect(responseEmpty.status).toBe(400);

    const responseType = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({ query: 12345 });
    expect(responseType.status).toBe(400);
  });

  // ── Test 2: Yetkisiz Arama Engel kontrolü ──────────────────────────────────
  test("POST /api/search yetkisiz (token'sız) çağrıldığında 401 dönmelidir", async () => {
    const response = await request(app)
      .post("/api/search")
      .send({ query: "React" });
    expect(response.status).toBe(401);
  });

  // ── Test 3: CANDIDATE Arama Yetki Engeli ────────────────────────────────────
  test("Aday (CANDIDATE) arama yapmaya çalıştığında 403 Forbidden almalıdır", async () => {
    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${userAToken}`)
      .send({ query: "Herhangi bir arama" });

    expect(response.status).toBe(403);
  });

  // ── Test 4: ADMIN Global Arama Testi ───────────────────────────────────────
  test("Yönetici (ADMIN) arama yaptığında sistemdeki tüm CV'ler gelmelidir", async () => {
    const queryVector = Array(1536).fill(0.1);
    queryVector[0] = 0.5;

    const searchSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(queryVector);

    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({ query: "tüm adaylar" });

    expect(response.status).toBe(200);
    expect(response.body.processingTimeMs).toBeDefined();
    expect(typeof response.body.processingTimeMs).toBe("number");

    const results = response.body.results;

    // Hem A hem B dönmeli
    const hasA = results.some((r: any) => r.cvId === cvAId);
    const hasB = results.some((r: any) => r.cvId === cvBId);

    expect(hasA).toBe(true);
    expect(hasB).toBe(true);

    // Her sonuçta matchedChunkId olmalı
    results.forEach((r: any) => {
      expect(r.matchedChunkId).toBeDefined();
      expect(typeof r.matchedChunkId).toBe("string");
    });

    searchSpy.mockRestore();
  });

  // ── Test 5: MAX Skoru ve Azalan Sıralama Doğrulaması ───────────────────────
  test("Sonuçlar azalan skora göre sıralanmalı ve CV skoru MAX chunk skoru olmalıdır", async () => {
    const queryVector = Array(1536).fill(0.1);
    queryVector[0] = 0.5;

    const searchSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(queryVector);

    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({ query: "MAX skoru testi" });

    expect(response.status).toBe(200);
    const results = response.body.results;

    expect(results.length).toBeGreaterThanOrEqual(2);

    // CV A skoru en yüksek olmalı ve ilk sırada yer almalı
    expect(results[0].cvId).toBe(cvAId);
    expect(results[0].score).toBeCloseTo(1.0, 5);

    // İkinci sırada CV B yer almalı ve skoru daha düşük olmalı
    expect(results[1].cvId).toBe(cvBId);
    expect(results[1].score).toBeLessThan(results[0].score);

    // Azalan sıralama kontrolü
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
    }

    searchSpy.mockRestore();
  });

  // ── Test 6: Eşik Değeri (> 0.3) Kontrolü ──────────────────────────────────
  test("Skoru 0.3 ve altında olan CV'ler arama sonuçlarında listelenmemelidir", async () => {
    // Arama sorgusuna çok uzak bir mock vektör veriyoruz (örneğin hepsi 0.9 olan vektöre karşı similarity hesaplanacak)
    // Bu sayede cosine similarity 0.3'ün altına düşecek
    const searchSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(Array(1536).fill(-0.5)); // Ters yönde vektör

    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({ query: "çok alakasız sorgu" });

    expect(response.status).toBe(200);
    const results = response.body.results;

    // Eşik değerinden (>0.3) dolayı hiçbir sonucun gelmemesi gerekir
    expect(results.length).toBe(0);

    searchSpy.mockRestore();
  });
});

