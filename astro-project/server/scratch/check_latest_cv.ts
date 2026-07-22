import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function checkLatestCv() {
  const cvs = await prisma.cV.findMany({
    orderBy: { createdAt: "desc" },
    take: 1,
    include: {
      chunks: {
        orderBy: { chunkIndex: "asc" }
      },
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (cvs.length === 0) {
    console.log("Hiç CV bulunamadı.");
    return;
  }

  const cv = cvs[0];
  console.log(`\n=== SON YÜKLENEN CV (ID: ${cv.id}) ===`);
  console.log(`Dosya Adı: ${cv.fileName}`);
  console.log(`Yüklenme Tarihi: ${cv.createdAt}`);
  console.log(`Chunk Sayısı: ${cv.chunks.length}`);
  
  if (cv.analyses.length > 0) {
    const analysis = cv.analyses[0];
    console.log(`\n--- AI Analiz Skoru: ${analysis.atsScore} ---`);
    console.log(`Model: ${analysis.modelUsed || 'Bilinmiyor'}`);
  } else {
    console.log("\n⚠️ AI Analizi YOK.");
  }

  console.log("\n--- CHUNK DETAYLARI VE KATMAN/MOCK/FALLBACK DURUMU ---");
  cv.chunks.forEach((c, idx) => {
    let meta: any = {};
    try {
      meta = typeof c.metadata === "string" ? JSON.parse(c.metadata) : c.metadata || {};
    } catch(e){}
    console.log(`Chunk #${idx + 1} | Key: ${c.sectionKey} | Başlık: "${c.sectionTitle}" | Confidence: ${c.confidenceScore}`);
    console.log(`  Source/Reasoning: ${meta.reasoning || meta.source || meta.layer || 'Bilinmiyor'}`);
  });

  await prisma.$disconnect();
  await pool.end();
}

checkLatestCv().catch(console.error);
