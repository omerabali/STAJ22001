import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const cv = await prisma.cV.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      rawText: true,
      chunks: {
        select: { chunkIndex: true, chunkText: true, metadata: true },
        orderBy: { chunkIndex: "asc" }
      }
    }
  });

  if (!cv) {
    console.log("No CV found.");
  } else {
    console.log("=== LAST CV CHUNKS AFTER FIX ===");
    console.log("File Name:", cv.fileName);
    console.log("\n=== CHUNKS ===");
    for (const ch of cv.chunks) {
      console.log(`\nChunk ${ch.chunkIndex} [${(ch.metadata as any)?.section || "Unknown"}]:`);
      console.log(ch.chunkText);
    }
  }
} finally {
  await prisma.$disconnect();
  await pool.end();
}
