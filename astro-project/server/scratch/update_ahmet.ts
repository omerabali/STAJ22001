import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function revertAhmet() {
  const updated = await prisma.user.update({
    where: { email: "ahmet@gmail.com" },
    data: { name: "Ahmet", role: "CANDIDATE" }
  });
  console.log("✅ Reverted ahmet@gmail.com to CANDIDATE with name Ahmet:", updated);
  await prisma.$disconnect();
  await pool.end();
}

revertAhmet();
