import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function verifyAll() {
  const usersCount = await prisma.user.count();
  const cvsCount = await prisma.cV.count();
  const chunksCount = await prisma.cVChunk.count();
  const embCount = await prisma.cVEmbedding.count();
  const analysesCount = await prisma.cVAnalysis.count();

  console.log("=== SİSTEM GENEL SAĞLIK & RAPOR ===");
  console.log(`Toplam Kullanıcı  : ${usersCount}`);
  console.log(`Toplam CV         : ${cvsCount}`);
  console.log(`Toplam Chunk      : ${chunksCount}`);
  console.log(`Toplam Embedding  : ${embCount}`);
  console.log(`Toplam AI Analiz  : ${analysesCount}`);
  console.log("----------------------------------");
  console.log(embCount === chunksCount ? "✅ Tüm chunk'lar eksiksiz vektörleştirildi (1-to-1 match)!" : "⚠️ Vektör eksikliği var!");

  await prisma.$disconnect();
  await pool.end();
}

verifyAll().catch(console.error);
