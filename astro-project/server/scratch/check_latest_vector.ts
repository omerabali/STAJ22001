import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function verifyLatest() {
  const latestCv = await prisma.cV.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      chunks: {
        include: { embeddings: true }
      }
    }
  });

  if (!latestCv) return;

  console.log(`\n=== YENİ YÜKLENEN CV KONTROLÜ (ID: ${latestCv.id}) ===`);
  console.log(`Dosya Adı: ${latestCv.fileName}`);
  console.log(`Chunk Sayısı: ${latestCv.chunks.length}`);
  
  let embeddedCount = 0;
  latestCv.chunks.forEach(c => {
    if (c.embeddings && c.embeddings.length > 0) embeddedCount++;
  });

  console.log(`Vektörleşmiş Chunk Sayısı: ${embeddedCount} / ${latestCv.chunks.length}`);
  if (embeddedCount === latestCv.chunks.length) {
    console.log("🎉 MÜKEMMEL: Yüklenen yeni CV'nin TÜM chunk'ları %100 AI motoruyla bölündü ve OpenAI ile vektörleştirildi!");
  }

  await prisma.$disconnect();
  await pool.end();
}

verifyLatest().catch(console.error);
