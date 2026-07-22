import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function checkApiTimings() {
  const calls = await prisma.aPICall.findMany({
    orderBy: { createdAt: "desc" },
    take: 20
  });

  console.log("\n=== SON YAPILAN OPENAI API ÇAĞRILARI VE SÜRE/JETON BİLGİLERİ ===");
  if (calls.length === 0) {
    console.log("Henüz kayıtlı API çağrısı bulunamadı.");
    return;
  }

  let totalCost = 0;
  calls.forEach((call, i) => {
    totalCost += call.costUsd || 0;
    console.log(`${i + 1}. [${call.endpoint || 'api'}] Model: ${call.model} | Giriş: ${call.tokensIn} tkn | Çıkış: ${call.tokensOut} tkn | Maliyet: $${(call.costUsd || 0).toFixed(6)} | Tarih: ${call.createdAt.toISOString().slice(11, 19)}`);
  });

  console.log(`\n💰 Toplam Son 20 Çağrı Maliyeti: $${totalCost.toFixed(6)}`);

  await prisma.$disconnect();
  await pool.end();
}

checkApiTimings().catch(console.error);
