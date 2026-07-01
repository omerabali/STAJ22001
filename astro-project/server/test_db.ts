import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const targetId = "608808f9-62f5-498d-89b4-8e455c5624d5";
  console.log("Attempting to delete CV with ID:", targetId);
  try {
    const deleted = await prisma.cV.delete({
      where: { id: targetId }
    });
    console.log("Success! Deleted CV:", deleted);
  } catch (err) {
    console.error("Delete failed with error:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
