import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const cvCount = await prisma.cV.count();
const embCount = await prisma.cVEmbedding.count();
const chunkCount = await prisma.cVChunk.count();

console.log("=== DB DURUMU ===");
console.log("CV sayısı       :", cvCount);
console.log("Chunk sayısı    :", chunkCount);
console.log("Embedding sayısı:", embCount);
console.log(embCount === 0 
  ? "⚠️  Embedding YOK — arama vector DB üzerinden çalışamaz!"
  : "✅ Embedding mevcut — arama çalışabilir (key olmadan bile)"
);

await prisma.$disconnect();
await pool.end();
