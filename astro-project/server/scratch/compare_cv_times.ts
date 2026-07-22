import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function compareCvTimes() {
  const cvs = await prisma.cV.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true, email: true } },
      chunks: true,
      analyses: { select: { atsScore: true, createdAt: true } }
    }
  });

  console.log("\n=== TÜM YÜKLENEN CV'LERİN İŞLENME VE SÜRE KARŞILAŞTIRMASI ===");
  if (cvs.length === 0) {
    console.log("CV bulunamadı.");
    return;
  }

  cvs.forEach((cv, idx) => {
    const name = cv.user?.name || cv.user?.email || "Bilinmiyor";
    const chunkCount = cv.chunks.length;
    const atsScore = cv.analyses[0]?.atsScore ?? "-";
    const createdAt = cv.createdAt.toLocaleTimeString("tr-TR");

    console.log(`\n📄 CV #${idx + 1}: ${cv.fileName}`);
    console.log(`   └─ Aday: ${name}`);
    console.log(`   └─ Yükleme Zamanı: ${createdAt}`);
    console.log(`   └─ Chunk Sayısı: ${chunkCount} parça`);
    console.log(`   └─ ATS Uyum Skoru: %${atsScore}`);
  });

  await prisma.$disconnect();
  await pool.end();
}

compareCvTimes().catch(console.error);
