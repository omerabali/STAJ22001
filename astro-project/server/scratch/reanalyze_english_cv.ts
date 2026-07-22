import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { analyzeWithOpenAI } from "../src/utils/parser.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function reanalyzeEnglishCv() {
  const cv = await prisma.cV.findFirst({
    where: { fileName: { contains: "Minimalist" } }
  });

  if (!cv || !cv.rawText) {
    console.log("Minimalist CV bulunamadı.");
    return;
  }

  console.log(`🔄 Minimalist CV (ID: ${cv.id}) yeni %100 Türkçe prompt ile yeniden analiz ediliyor...`);
  const result = await analyzeWithOpenAI(cv.rawText, "en", prisma);

  await prisma.cVAnalysis.create({
    data: {
      cvId: cv.id,
      atsScore: result.atsScore,
      skills: result.skills,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      suggestions: result.suggestions,
      status: "COMPLETED"
    }
  });

  console.log("✅ Başarıyla %100 Türkçe olarak veritabanında güncellendi!");

  await prisma.$disconnect();
  await pool.end();
}

reanalyzeEnglishCv().catch(console.error);
