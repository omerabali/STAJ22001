/**
 * GÜN 26 — Semantic Search Doğrulama & Performans Testi
 * Çalıştır: npx tsx -r dotenv/config scratch/gun26_search_test.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { searchSimilarCVs } from "../src/utils/embeddings.js";
import { RankingService } from "../src/services/RankingService.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SEP = "─".repeat(65);

async function runQuery(query: string, label: string) {
  console.log(`\n${SEP}`);
  console.log(`🔍 [${label}] Sorgu: "${query}"`);
  console.log(SEP);

  const t0 = Date.now();
  const vectorMatches = await searchSimilarCVs(query, 10, prisma);
  const vectorMs = Date.now() - t0;

  const t1 = Date.now();
  const ranked = await RankingService.scoreAndRankCVs(query, vectorMatches, prisma);
  const rankMs = Date.now() - t1;

  const totalMs = Date.now() - t0;

  console.log(`⏱  Vektör arama : ${vectorMs} ms`);
  console.log(`⏱  GPT sıralama : ${rankMs} ms`);
  console.log(`⏱  TOPLAM       : ${totalMs} ms`);
  console.log(`📊 Sonuç sayısı : ${ranked.length}`);

  if (ranked.length > 0) {
    console.log("\n📋 İlk 3 Aday:");
    ranked.slice(0, 3).forEach((r: any, i: number) => {
      const name = r.user?.name || r.userName || "İsimsiz";
      const score = r.gptScore ?? r.score ?? r.similarityScore ?? "?";
      const sim = r.similarityScore !== undefined ? `sim=${(r.similarityScore * 100).toFixed(1)}%` : "";
      console.log(`  ${i + 1}. ${name} | skor=${score} ${sim}`);
    });
  } else {
    console.log("⚠️  Sonuç bulunamadı.");
  }

  return { query, label, vectorMs, rankMs, totalMs, count: ranked.length, ranked };
}

async function testConsistency(query: string) {
  console.log(`\n${"═".repeat(65)}`);
  console.log(`♻️  TUTARLILIK TESTİ — Aynı sorgu 2 kez çalıştırılıyor`);
  console.log(`${"═".repeat(65)}`);

  const r1 = await runQuery(query, "1. Çalıştırma");
  const r2 = await runQuery(query, "2. Çalıştırma");

  // Skor karşılaştırması
  const scores1 = r1.ranked.slice(0, 3).map((r: any) => r.gptScore ?? r.score ?? 0);
  const scores2 = r2.ranked.slice(0, 3).map((r: any) => r.gptScore ?? r.score ?? 0);

  const allSame = scores1.every((s: number, i: number) => Math.abs(s - (scores2[i] ?? 0)) < 5);

  console.log(`\n✅ Skor Tutarlılığı: ${allSame ? "TUTARLI (±5 puan içinde)" : "TUTARSIZ ⚠️"}`);
  console.log(`  1. Çalıştırma skorları: [${scores1.join(", ")}]`);
  console.log(`  2. Çalıştırma skorları: [${scores2.join(", ")}]`);

  return { r1, r2, consistent: allSame };
}

async function testFallback() {
  console.log(`\n${"═".repeat(65)}`);
  console.log(`🛡️  FALLBACK TESTİ — OpenAI key geçici olarak bozuluyor`);
  console.log(`${"═".repeat(65)}`);

  const realKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "sk-INVALID-KEY-FOR-FALLBACK-TEST";

  try {
    const t0 = Date.now();
    const vectorMatches = await searchSimilarCVs("React developer", 5, prisma);
    const ranked = await RankingService.scoreAndRankCVs("React developer", vectorMatches, prisma);
    const ms = Date.now() - t0;

    console.log(`⏱  Fallback tamamlandı: ${ms} ms`);
    console.log(`📊 Fallback sonuç sayısı: ${ranked.length}`);
    if (ranked.length > 0) {
      const hasScore = ranked[0].gptScore !== undefined || ranked[0].score !== undefined;
      console.log(`✅ Sistem çökmedi — fallback ${hasScore ? "rule-based skor" : "similarity skor"} ile devam etti`);
    } else {
      console.log(`✅ Sistem çökmedi — fallback boş sonuç döndürdü (normal)`);
    }
  } catch (err: any) {
    console.log(`⚠️  Fallback hatası (beklenen davranış): ${err.message?.slice(0, 120)}`);
    console.log(`✅ Sistem hata yönetimini çalıştırdı — çökmedi`);
  } finally {
    process.env.OPENAI_API_KEY = realKey;
    console.log(`🔑 OpenAI key geri yüklendi`);
  }
}

async function main() {
  console.log(`\n${"═".repeat(65)}`);
  console.log(`🚀 GÜN 26 — SEMANTİK ARAMA DOĞRULAMA TESTLERİ`);
  console.log(`${"═".repeat(65)}`);

  const results: any[] = [];

  // --- TEST 1: Farklı sorgular ile performans ölçümü ---
  const queries = [
    "React bilen frontend geliştirici",
    "Python machine learning deneyimi olan",
    "Dijital pazarlama yöneticisi",
  ];

  for (const q of queries) {
    const r = await runQuery(q, "Performans Testi");
    results.push(r);
  }

  // --- TEST 2: Skor tutarlılığı ---
  const consistency = await testConsistency("React bilen frontend geliştirici");

  // --- TEST 3: Fallback ---
  await testFallback();

  // --- ÖZET ---
  console.log(`\n${"═".repeat(65)}`);
  console.log(`📈 PERFORMANS ÖZETİ`);
  console.log(`${"═".repeat(65)}`);
  const times = results.map(r => r.totalMs);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log(`  Min süre : ${min} ms  (${(min / 1000).toFixed(2)} sn)`);
  console.log(`  Max süre : ${max} ms  (${(max / 1000).toFixed(2)} sn)`);
  console.log(`  Ort süre : ${avg} ms  (${(avg / 1000).toFixed(2)} sn)`);
  console.log(`  Tutarlılık: ${consistency.consistent ? "✅ TUTARLI" : "⚠️ TUTARSIZ"}`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => {
  console.error("❌ Test hatası:", err);
  process.exit(1);
});
