import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function checkAnalysisData() {
  const latestAnalysis = await prisma.cVAnalysis.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      cv: {
        select: { fileName: true, user: { select: { name: true, email: true } } }
      }
    }
  });

  if (!latestAnalysis) {
    console.log("Analiz kaydı bulunamadı.");
    return;
  }

  console.log(`\n=== SON AI ANALİZ KAYDI VERİTABANI İNCELEMESİ ===`);
  console.log(`CV Dosyası: ${latestAnalysis.cv?.fileName}`);
  console.log(`Kullanıcı: ${latestAnalysis.cv?.user?.name || latestAnalysis.cv?.user?.email}`);
  console.log(`ATS Skoru: %${latestAnalysis.atsScore}`);
  console.log(`Model: ${latestAnalysis.modelUsed || 'OpenAI gpt-4o-mini'}`);
  console.log("\n--- YETENEKLER (SKILLS) ---");
  console.log(latestAnalysis.skills);
  console.log("\n--- GÜÇLÜ YÖNLER (STRENGTHS) ---");
  console.log(latestAnalysis.strengths);
  console.log("\n--- GELİŞİME AÇIK ALANLAR / GAPS ---");
  console.log(latestAnalysis.gaps);
  console.log("\n--- MÜLAKAT SORULARI / SUGGESTIONS ---");
  console.log(latestAnalysis.suggestions);

  await prisma.$disconnect();
  await pool.end();
}

checkAnalysisData().catch(console.error);
