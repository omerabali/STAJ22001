import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true }
  });
  console.log("=== ALL USERS IN DB ===");
  console.table(users);
  await prisma.$disconnect();
  await pool.end();
}

checkUsers();
