import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/astro_db?schema=public" });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function inspectRawEndpointJson() {
  // Aday kullanıcısını bulalım
  const user = await prisma.user.findFirst({
    where: { cvs: { some: {} } },
    select: { id: true }
  });

  if (!user) {
    console.log("CV sahibi aday bulunamadı.");
    await prisma.$disconnect();
    return;
  }

  // GET /api/admin/candidates/:id mantığıyla ham veriyi simüle edelim
  const candidate = await prisma.user.findFirst({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatarUrl: true,
      createdAt: true,
      cvs: {
        include: {
          analyses: {
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  console.log("=== HAM API JSON YANITI ===");
  console.log(JSON.stringify({ candidate }, null, 2));

  await prisma.$disconnect();
}

inspectRawEndpointJson().catch(err => {
  console.error("Error:", err);
  prisma.$disconnect();
});
