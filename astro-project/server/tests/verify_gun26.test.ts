/**
 * verify_gun26.test.ts
 *
 * Gün 26 - Jest Test Suite:
 *   1. CANDIDATE arama yaptığında 403 Forbidden almalıdır.
 *   2. GPT bozuk veya eksik JSON döndüğünde sistem ayakta kalıyor mu? (Structured Output Validasyonu)
 *   3. Metin 4000 karakterden uzun olduğunda kırpma (truncation) düzgün çalışıyor mu?
 *   4. Hibrid sıralama formülü matematiksel ağırlığı doğru yansıtıyor mu?
 *   5. OpenAI çağrısı sonrası bütçe tablosuna (api_calls) doğru maliyet ve token yansıyor mu?
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

describe("Gün 26 - Jest: GPT Uyum Değerlendirmesi Detaylı Doğrulama Testleri", () => {

  beforeAll(async () => {
    // 1. Kullanıcıları oluştur
    const admin = await prisma.user.create({
      data: {
        email: `jest-rank-admin-${Date.now()}-${Math.floor(Math.random() * 1000000)}@example.com`,
        passwordHash: "pass",
        phone: `admin-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        name: "Rank Admin",
        role: "ADMIN"
      }
    });
    adminId = admin.id;
    adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, jwtSecret);

    const userA = await prisma.user.create({
      data: {
        email: `jest-rank-userA-${Date.now()}-${Math.floor(Math.random() * 1000000)}@example.com`,
        passwordHash: "pass",
        phone: `usera-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        name: "Aday A",
        role: "CANDIDATE"
      }
    });
    userAId = userA.id;
    userAToken = jwt.sign({ id: userA.id, email: userA.email, role: userA.role }, jwtSecret);

    const userB = await prisma.user.create({
      data: {
        email: `jest-rank-userB-${Date.now()}-${Math.floor(Math.random() * 1000000)}@example.com`,
        passwordHash: "pass",
        phone: `userb-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        name: "Aday B",
        role: "CANDIDATE"
      }
    });
    userBId = userB.id;
    userBToken = jwt.sign({ id: userB.id, email: userB.email, role: userB.role }, jwtSecret);

    // 2. CV'leri oluştur (Metin 4000 karakterden uzun olduğunda kırpma doğrulaması için CV A'yı 5000 karakter yapıyoruz)
    const longText = "React uzmanı ".repeat(500); // 500 * 13 = 6500 characters
    const cvA = await prisma.cV.create({
      data: {
        userId: userA.id,
        fileName: "userA-cv.pdf",
        fileUrl: "https://example.com/userA-cv.pdf",
        hash: `hash-a-${Date.now()}`,
        rawText: longText
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
    highArr[0] = 0.5; // CV A (Score: 100)

    const medArr = Array(1536).fill(0.1);
    medArr[0] = 0.2; // CV B (Score: ~99.7)

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

  // ── Test 1: CANDIDATE yetki engeli ──────────────────────────────────────────
  test("CANDIDATE arama yapmaya çalıştığında 403 Forbidden almalıdır", async () => {
    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${userAToken}`)
      .send({ query: "React" });
    expect(response.status).toBe(403);
  });

  // ── Test 2: Structured Output Validasyonu ───────────────────────────────────
  test("GPT bozuk veya eksik JSON döndüğünde sistem ayakta kalmalı ve fallback tetiklenmelidir", async () => {
    const queryVector = Array(1536).fill(0.1);
    queryVector[0] = 0.5;

    const vectorSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(queryVector);

    const mockFetch = jest.spyOn(global, "fetch") as any;
    // Bozuk JSON dönüyoruz
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: "{ bozuk_json_yapi"
            }
          }
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 10
        }
      })
    });

    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({ query: "bozuk JSON testi" });

    expect(response.status).toBe(200); // Sistem patlamamalı!
    
    const results = response.body.results;
    expect(results.length).toBeGreaterThanOrEqual(2);
    
    // GPT skoru null olmalı ve fallback açıklaması yazılmalı
    expect(results[0].gptScore).toBeNull();
    expect(results[0].matchExplanation).toContain("Yapay zeka analizi şu anda kullanılamıyor");

    vectorSpy.mockRestore();
    mockFetch.mockRestore();
  });

  // ── Test 3: Kırpma (Truncation) Doğrulaması ──────────────────────────────────
  test("CV metni 4000 karakterden uzun olduğunda kırpma düzgün çalışmalı ve GPT'ye kısaltılmış gitmelidir", async () => {
    const queryVector = Array(1536).fill(0.1);
    queryVector[0] = 0.5;

    const vectorSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(queryVector);

    const mockFetch = jest.spyOn(global, "fetch") as any;
    let capturedPayload: any = null;

    mockFetch.mockImplementation(async (url: string, init: any) => {
      capturedPayload = JSON.parse(init.body);
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  evaluations: [
                    { cvId: cvAId, suitabilityScore: 80, matchExplanation: "Uyumlu" }
                  ]
                })
              }
            }
          ],
          usage: {
            prompt_tokens: 150,
            completion_tokens: 50
          }
        })
      };
    });

    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({ query: "kırpma testi" });

    expect(response.status).toBe(200);
    expect(capturedPayload).not.toBeNull();

    // GPT'ye giden user mesajını yakala ve parse et
    const userMessageContent = capturedPayload.messages[1].content;
    expect(userMessageContent).toContain(cvAId);

    // Prompt içindeki aday verisini doğrula (Metin 4000 karakterden az veya eşit olmalı)
    const match = userMessageContent.match(/\"text\":\s*\"([^\"]+)\"/);
    if (match && match[1]) {
      expect(match[1].length).toBeLessThanOrEqual(4000);
    }

    vectorSpy.mockRestore();
    mockFetch.mockRestore();
  });

  // ── Test 4: Hibrid Sıralama Formülü Matematiksel Doğrulama ───────────────────
  test("Hibrid sıralama formülü matematiksel ağırlığı doğru yansıtmalıdır", async () => {
    const queryVector = Array(1536).fill(0.1);
    queryVector[0] = 0.5;

    const vectorSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(queryVector);

    const mockFetch = jest.spyOn(global, "fetch") as any;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                evaluations: [
                  { cvId: cvAId, suitabilityScore: 40, matchExplanation: "Orta seviye." },
                  { cvId: cvBId, suitabilityScore: 90, matchExplanation: "Çok iyi." }
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
      .send({ query: "Hibrid matematik testi" });

    expect(response.status).toBe(200);
    const results = response.body.results;

    // CV A (Vektör skoru tam 1.0 -> normalized 100). GPT skoru: 40
    // Beklenen hibrid skor: 100 * 0.4 + 40 * 0.6 = 40 + 24 = 64.0
    const cvAResult = results.find((r: any) => r.cvId === cvAId);
    expect(cvAResult).toBeDefined();
    expect(cvAResult.score).toBeCloseTo(64.0, 1);

    // CV B (Vektör skoru ~99.7). GPT skoru: 90
    // Beklenen hibrid skor: 99.71 * 0.4 + 90 * 0.6 = 39.88 + 54 = 93.88
    const cvBResult = results.find((r: any) => r.cvId === cvBId);
    expect(cvBResult).toBeDefined();
    expect(cvBResult.score).toBeCloseTo(93.9, 1);

    vectorSpy.mockRestore();
    mockFetch.mockRestore();
  });

  // ── Test 5: api_calls Tablosu Maliyet ve Token Doğrulaması ──────────────────
  test("OpenAI çağrısı sonrası api_calls tablosuna doğru maliyet ve token yansımalıdır", async () => {
    const queryVector = Array(1536).fill(0.1);
    queryVector[0] = 0.5;

    const vectorSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(queryVector);

    const mockFetch = jest.spyOn(global, "fetch") as any;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                evaluations: [
                  { cvId: cvAId, suitabilityScore: 85, matchExplanation: "Uyumlu" }
                ]
              })
            }
          }
        ],
        usage: {
          prompt_tokens: 300,
          completion_tokens: 150
        }
      })
    });

    const response = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({ query: "api log testi" });

    expect(response.status).toBe(200);

    // api_calls tablosundaki en son kaydı çekiyoruz
    const apiCall = await prisma.aPICall.findFirst({
      orderBy: { createdAt: "desc" }
    });

    expect(apiCall).not.toBeNull();
    expect(apiCall!.endpoint).toBe("chat");
    expect(apiCall!.model).toBe("gpt-4o-mini");
    expect(apiCall!.status).toBe("SUCCESS");
    expect(apiCall!.tokensIn).toBe(300);
    expect(apiCall!.tokensOut).toBe(150);

    // Maliyet hesabı: 300 * 0.00000015 + 150 * 0.00000060 = 0.000045 + 0.000090 = 0.000135
    expect(Number(apiCall!.costUsd)).toBeCloseTo(0.000135, 8);

    vectorSpy.mockRestore();
    mockFetch.mockRestore();
  });

  // ── Test 6: Arama Geçmişi (SearchLog) Doğrulaması ───────────────────────────
  test("Arama yapıldığında arama geçmişi kaydedilmeli ve logs rotasından son aramalar listelenmelidir", async () => {
    const queryVector = Array(1536).fill(0.1);
    queryVector[0] = 0.5;

    const vectorSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(queryVector);

    const mockFetch = jest.spyOn(global, "fetch") as any;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ evaluations: [] }) } }]
      })
    });

    const uniqueQuery = `ozel-kriter-sorgusu-${Date.now()}`;
    const responsePost = await request(app)
      .post("/api/search")
      .set("Cookie", `token=${adminToken}`)
      .send({ query: uniqueQuery });

    expect(responsePost.status).toBe(200);

    // Logs rotasını çağırıp geçmişi çekiyoruz
    const responseGet = await request(app)
      .get("/api/search/logs")
      .set("Cookie", `token=${adminToken}`);

    expect(responseGet.status).toBe(200);
    expect(Array.isArray(responseGet.body)).toBe(true);
    expect(responseGet.body.length).toBeGreaterThanOrEqual(1);

    // Son arama en başta ve bizim arattığımız uniqueQuery olmalı
    expect(responseGet.body[0].query).toBe(uniqueQuery);
    expect(responseGet.body[0].userId).toBe(adminId);

    vectorSpy.mockRestore();
    mockFetch.mockRestore();
  });
});
