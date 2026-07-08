/**
 * verify_gun24.test.ts
 *
 * Gün 24 - Jest Test Suite:
 *   1. APICall tablosuna doğru maliyet logu düşüyor mu?
 *   2. EmbeddingService 429 rate-limit hatalarında exponential backoff ile 4 kez retry yapıp FAILED mi logluyor?
 *   3. /api/admin/cost-report endpoint'i toplam maliyet özetini doğru döndürüyor mu?
 *   4. Güvenlik Fix: searchSimilarChunks kullanıcı izolasyonu — User B User A'nın embedding'lerini göremez
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
import { searchSimilarChunks } from "../src/utils/embeddings.js";

// ── Prisma Setup ──────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// ── Test State ─────────────────────────────────────────────────────────────────
let adminToken: string;
let tempAdminId: string;
let apiCallCountBefore: number;

// ─────────────────────────────────────────────────────────────────────────────
describe("Gün 24 - Jest: Maliyet Takibi, Rate Limit Yönetimi ve Admin API Testleri", () => {

  beforeAll(async () => {
    // Create a temporary admin user for the cost-report test
    const tempAdmin = await prisma.user.create({
      data: {
        email: `jest-admin-gun24-${Date.now()}@example.com`,
        passwordHash: "admin-pass",
        phone: "5550000024",
        name: "Jest Admin Gun24",
        role: "ADMIN"
      }
    });
    tempAdminId = tempAdmin.id;

    const jwtSecret = process.env.JWT_SECRET || "test-jwt-secret";
    adminToken = jwt.sign(
      { id: tempAdmin.id, email: tempAdmin.email, role: tempAdmin.role },
      jwtSecret
    );

    // Record how many API call logs exist before tests run
    apiCallCountBefore = await (prisma as any).aPICall.count();
  });

  afterAll(async () => {
    // Cleanup: delete the temporary admin user
    await prisma.user.delete({ where: { id: tempAdminId } }).catch(() => {});

    // Close Prisma and db pool
    await prisma.$disconnect();
    await pool.end();

    // Close the app pool to avoid Jest hanging
    if (appPool && typeof (appPool as any).end === "function") {
      await (appPool as any).end().catch(() => {});
    }
  });

  // ── Test 1: APICall tablosunun varlığı ve erişimi ──────────────────────────
  test("APICall tablosu Prisma üzerinden erişilebilir olmalıdır", async () => {
    const count = await (prisma as any).aPICall.count();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ── Test 2: Başarılı embedding sonrası APICall logu ───────────────────────
  test("Başarılı generateEmbedding() çağrısı api_calls tablosuna SUCCESS logu düşürmelidir", async () => {
    const testText = "Bu bir gün 24 embedding loglama testidir.";

    await EmbeddingService.generateEmbedding(testText, prisma);

    const successLog = await (prisma as any).aPICall.findFirst({
      where: {
        status: "SUCCESS",
        endpoint: "embedding",
        model: "text-embedding-3-small"
      },
      orderBy: { createdAt: "desc" }
    });

    expect(successLog).not.toBeNull();
    expect(successLog.tokensIn).toBeGreaterThan(0);
    expect(Number(successLog.costUsd)).toBeGreaterThan(0);
    // Maliyet: tokensIn * $0.00000002
    expect(Number(successLog.costUsd)).toBeCloseTo(successLog.tokensIn * 0.00000002, 8);
  });

  // ── Test 3: 429 Rate Limit → Retry → FAILED log ───────────────────────────
  test("429 Rate Limit hatasında EmbeddingService 4 kez deneyip FAILED loglamalıdır", async () => {
    // OpenAI client henüz initialize olmamışsa bir çağrı yaparak init ettir
    if (!(EmbeddingService as any).openai) {
      await EmbeddingService.generateEmbedding("init", prisma).catch(() => {});
    }

    const openaiInstance = (EmbeddingService as any).openai;
    const createSpy = jest.spyOn(openaiInstance.embeddings, "create");
    createSpy.mockRejectedValue(
      Object.assign(new Error("Rate limit reached"), { status: 429 })
    );

    // 4 retry sonunda fırlatmalı
    await expect(
      EmbeddingService.generateEmbedding("429 rate limit retry test", prisma)
    ).rejects.toThrow();

    // Tam 4 kez denenmiş olmalı (maxAttempts = 4)
    expect(createSpy).toHaveBeenCalledTimes(4);

    createSpy.mockRestore();
    // Sonraki testler için client'ı sıfırla
    (EmbeddingService as any).openai = null;

    // FAILED logu veritabanına yazılmış olmalı
    const failedLog = await (prisma as any).aPICall.findFirst({
      where: { status: "FAILED", endpoint: "embedding" },
      orderBy: { createdAt: "desc" }
    });
    expect(failedLog).not.toBeNull();
  });

  // ── Test 4: Toplam kayıt sayısı artmış olmalı ─────────────────────────────
  test("Testler sonrasında api_calls tablosundaki kayıt sayısı artmalıdır", async () => {
    const countAfter = await (prisma as any).aPICall.count();
    expect(countAfter).toBeGreaterThan(apiCallCountBefore);
  });

  // ── Test 5: GET /api/admin/cost-report ────────────────────────────────────
  test("GET /api/admin/cost-report toplam maliyet özetini doğru döndürmelidir", async () => {
    const response = await request(app)
      .get("/api/admin/cost-report")
      .set("Cookie", `token=${adminToken}`);

    expect(response.status).toBe(200);

    const { summary, modelStats } = response.body;
    expect(summary).toBeDefined();
    expect(typeof summary.totalCostUsd).toBe("number");
    expect(typeof summary.totalTokensIn).toBe("number");
    expect(typeof summary.totalTokensOut).toBe("number");
    expect(typeof summary.successCalls).toBe("number");
    expect(typeof summary.failedCalls).toBe("number");
    expect(typeof summary.totalCalls).toBe("number");

    // modelStats bir dizi olmalı
    expect(Array.isArray(modelStats)).toBe(true);
  });

  // ── Test 6: Yetkisiz kullanıcı erişimi ────────────────────────────────────
  test("Yetkisiz kullanıcı GET /api/admin/cost-report için 401/403 almalıdır", async () => {
    const response = await request(app)
      .get("/api/admin/cost-report");

    expect([401, 403]).toContain(response.status);
  });

  // ── Test 7: Güvenlik Fix — Cross-user search izolasyonu ───────────────────
  // Bu test, 2026-07-08'de tespit edilen ve düzeltilen güvenlik açığını doğrular:
  // /api/cv/search endpoint'i önceden userId filtresi olmadan TÜM kullanıcıların
  // embedding'lerini döndürüyordu. Fix sonrası her kullanıcı yalnızca kendi verisini görür.
  test("Güvenlik Fix: searchSimilarChunks — User B, User A'nın embedding'lerini görmemelidir", async () => {
    // ── Setup: İki ayrı kullanıcı oluştur ──────────────────────────────────
    const userA = await prisma.user.create({
      data: {
        email: `security-test-userA-${Date.now()}@example.com`,
        passwordHash: "hashed-pass",
        phone: "5551110001",
        name: "Security Test User A"
      }
    });
    const userB = await prisma.user.create({
      data: {
        email: `security-test-userB-${Date.now()}@example.com`,
        passwordHash: "hashed-pass",
        phone: "5551110002",
        name: "Security Test User B"
      }
    });

    // ── User A için CV + Chunk + Embedding oluştur ──────────────────────────
    const cvA = await prisma.cV.create({
      data: {
        userId: userA.id,
        fileName: "security-test-userA.pdf",
        fileUrl: "https://example.com/security-test-userA.pdf",
        hash: `security-hash-A-${Date.now()}`
      }
    });
    const chunkA = await prisma.cVChunk.create({
      data: {
        cvId: cvA.id,
        chunkText: "User A gizli özgeçmiş verisi",
        chunkIndex: 0
      }
    });

    // Gerçek bir 1536 boyutlu vektörü raw SQL ile ekle
    const fakeVector = `[${Array(1536).fill(0.05).join(",")}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO cv_embeddings (id, "chunkId", embedding, model) VALUES (gen_random_uuid(), $1, $2::vector, $3)`,
      chunkA.id, fakeVector, "text-embedding-3-small"
    );

    // ── Mock: query embedding'ini de aynı sahte vektörle döndür ────────────
    const searchSpy = jest.spyOn(EmbeddingService, "generateEmbedding")
      .mockResolvedValue(Array(1536).fill(0.05));

    // ── Test: User B ile arama yap — User A'nın verisi GÖRÜNMEMELİ ────────
    const resultsAsUserB = await searchSimilarChunks("gizli veri", 5, prisma, undefined, userB.id);
    const userBSeesUserAData = resultsAsUserB.some(r => r.cvId === cvA.id);
    expect(userBSeesUserAData).toBe(false); // ✅ User B User A'nın datasını GÖRMEMELI

    // ── Test: User A ile arama yap — kendi verisi GÖRÜNMELİ ───────────────
    const resultsAsUserA = await searchSimilarChunks("gizli veri", 5, prisma, undefined, userA.id);
    const userASeesOwnData = resultsAsUserA.some(r => r.cvId === cvA.id);
    expect(userASeesOwnData).toBe(true); // ✅ User A kendi datasını GÖRMELİ

    searchSpy.mockRestore();

    // ── Cleanup ─────────────────────────────────────────────────────────────
    await prisma.cV.delete({ where: { id: cvA.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
    await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
  });
});
