import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/astro_db?schema=public" });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function verifyDbIntegrityAndPdfContent() {
  console.log("=== 1. AHMET KULLANICISI VE CV / ANALİZ EŞLEŞMESİ SORGUSU ===");
  const ahmet = await prisma.user.findFirst({
    where: { email: "ahmet@gmail.com" },
    include: {
      cvs: {
        include: {
          analyses: { orderBy: { createdAt: "desc" } }
        }
      }
    }
  });

  if (!ahmet) {
    console.log("Ahmet kullanıcısı bulunamadı.");
  } else {
    console.log(`Kullanıcı ID: ${ahmet.id} | İsim: ${ahmet.name} | E-posta: ${ahmet.email}`);
    console.log(`Yüklü CV Sayısı: ${ahmet.cvs.length}`);

    ahmet.cvs.forEach((cv, idx) => {
      console.log(`\n--- CV #${idx + 1} ---`);
      console.log(`CV ID: ${cv.id}`);
      console.log(`CV userId: ${cv.userId} (Eşleşiyor mu: ${cv.userId === ahmet.id})`);
      console.log(`Dosya Adı: ${cv.fileName}`);
      console.log(`Yüklenme Tarihi: ${cv.createdAt.toISOString()}`);
      console.log(`Çıkarılan Gerçek PDF Metni (rawText ilk 300 karakter):`);
      console.log(`"${cv.rawText.substring(0, 300)}..."`);
      
      console.log(`Bağlı Analiz Sayısı: ${cv.analyses.length}`);
      cv.analyses.forEach((an, aIdx) => {
        console.log(`  - Analiz #${aIdx + 1} [ID: ${an.id}] | Status: ${an.status} | ATS: ${an.atsScore}`);
        console.log(`    Analiz cvId: ${an.cvId} (Eşleşiyor mu: ${an.cvId === cv.id})`);
        console.log(`    Güçlü Yönler:`, JSON.stringify(an.strengths));
      });
    });
  }

  console.log("\n=== 3. SİSTEMDEKİ DİĞER TÜM ADAYLARIN GÜÇLÜ YÖNLERİ SORGUSU ===");
  const allUsersWithCvs = await prisma.user.findMany({
    where: { cvs: { some: {} } },
    include: {
      cvs: {
        include: {
          analyses: { orderBy: { createdAt: "desc" }, take: 1 }
        }
      }
    }
  });

  allUsersWithCvs.forEach(u => {
    console.log(`\nADAY: ${u.name} (${u.email}) [ID: ${u.id}]`);
    u.cvs.forEach(c => {
      const latestAn = c.analyses[0];
      console.log(`  📄 CV: ${c.fileName} [CV ID: ${c.id}]`);
      if (latestAn) {
        console.log(`     ATS Skoru: %${latestAn.atsScore}`);
        console.log(`     Güçlü Yönler:`, JSON.stringify(latestAn.strengths));
      } else {
        console.log(`     Analiz Yok.`);
      }
    });
  });

  await prisma.$disconnect();
}

verifyDbIntegrityAndPdfContent().catch(err => {
  console.error("Hata:", err);
  prisma.$disconnect();
});
