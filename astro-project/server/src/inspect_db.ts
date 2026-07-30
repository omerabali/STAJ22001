import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import { chunkTextBySections } from './utils/parser.js';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const mhemet = await prisma.user.findFirst({
    where: { email: { contains: 'mahmet' } },
    include: { cvs: true }
  });

  if (!mhemet || !mhemet.cvs[0]) {
    console.log('User or CV not found.');
    return;
  }

  const cv = mhemet.cvs[0];
  console.log('Testing chunking algorithm on CV rawText for:', cv.fileName);
  
  const chunks = await chunkTextBySections(cv.rawText || '', prisma);
  console.log('\n--- NEW PARSED CHUNKS COUNT:', chunks.length);
  chunks.forEach((c, i) => {
    console.log(`\n--- Chunk ${i + 1} [Section: ${c.metadata.section}]:`);
    console.log(c.chunkText);
  });
}

check().catch(console.error).finally(() => prisma.$disconnect());
