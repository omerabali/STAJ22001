import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { analyzeWithOpenAI } from "../src/utils/parser.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function testHelinKinayCv() {
  console.log("=================================================");
  console.log("🧪 TEST 1: 'Bej Sade Modern İş Başvurusu' (Helin Kınay) Mülakat Soruları Dedup Testi");
  console.log("=================================================\n");

  const cv = await prisma.cV.findFirst({
    where: { fileName: { contains: "Bej Sade Modern" } }
  });

  if (!cv || !cv.rawText) {
    console.error("❌ CV veritabanında bulunamadı!");
    return;
  }

  console.log(`📄 Bulunan CV: ${cv.fileName}`);
  const result = await analyzeWithOpenAI(cv.rawText, "tr", prisma);

  console.log(`\n📋 Üretilen Mülakat Önerileri ve Soruları (${result.suggestions.length} Adet):`);
  result.suggestions.forEach((sug, idx) => {
    console.log(`\n  [Soru ${idx + 1}]`);
    console.log(`  - Öncelik: ${sug.priority}`);
    console.log(`  - Tavsiye (Action): ${sug.action}`);
    console.log(`  - Mülakat Sorusu: "${sug.question}"`);
  });

  // Check uniqueness of questions
  const questions = result.suggestions.map(s => s.question);
  const uniqueQuestions = new Set(questions);
  console.log(`\n🎯 Toplam Soru Sayısı: ${questions.length} | Benzersiz Soru Sayısı: ${uniqueQuestions.size}`);

  if (questions.length === uniqueQuestions.size) {
    console.log("✅ TEST BAŞARILI: Üretilen tüm sorular birbirinden FARKLI ve benzersizdir!");
  } else {
    console.warn("⚠️ UYARI: Benzer soru üretildi!");
  }

  console.log("\n=================================================");
  console.log("🧪 TEST 3: Backend JSON Alan Adı 'eksik_yonler' Kontrolü");
  console.log("=================================================\n");
  console.log("Returned Keys:", Object.keys(result));
  console.log("Weaknesses (Eksik Yönler):", result.weaknesses);

  await prisma.$disconnect();
  await pool.end();
}

testHelinKinayCv().catch(console.error);
