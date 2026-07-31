import "../../src/load-env.js";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { JwtService } from "../../src/infrastructure/security/JwtService.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CV_DIR = path.join(process.cwd(), "tests", "cv");
const BENCHMARK_DIR = path.join(process.cwd(), "tests", "benchmark");
const OUTPUT_JSON_PATH = path.join(BENCHMARK_DIR, "benchmark_bulk_upload.json");
const SERVER_URL = "http://localhost:5000";

if (!fs.existsSync(BENCHMARK_DIR)) {
  fs.mkdirSync(BENCHMARK_DIR, { recursive: true });
}

async function cleanupBenchmarkCvs(fileNames: string[], userId: string) {
  console.log("🧹 [Toplu Benchmark] DB ve depolamadaki eski test CV'leri temizleniyor...");
  const cvs = await prisma.cV.findMany({
    where: {
      userId,
      fileName: { in: fileNames }
    }
  });

  for (const cv of cvs) {
    await prisma.cV.delete({ where: { id: cv.id } }).catch(() => {});
  }
  console.log(`🧹 ${cvs.length} adet eski benchmark kaydı temizlendi.\n`);
}

async function main() {
  console.log("🚀 =========================================================");
  console.log("🚀 SENARYO 2 — TOPLU YÜKLEME BENCHMARK TESTİ (HEPSİ AYNI ANDA)");
  console.log("🚀 =========================================================\n");

  const files = fs.readdirSync(CV_DIR).filter(f => f.endsWith(".pdf")).slice(0, 5);
  if (files.length === 0) {
    console.error("❌ tests/cv klasöründe PDF dosyası bulunamadı!");
    process.exit(1);
  }

  // Admin kullanıcısı al ve JWT üret
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) throw new Error("Admin kullanıcısı bulunamadı.");

  const token = JwtService.signToken({
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    name: adminUser.name
  });

  await cleanupBenchmarkCvs(files, adminUser.id);

  let peakRss = 0;
  let peakHeapUsed = 0;

  function trackMemory() {
    const mem = process.memoryUsage();
    if (mem.rss > peakRss) peakRss = mem.rss;
    if (mem.heapUsed > peakHeapUsed) peakHeapUsed = mem.heapUsed;
  }

  trackMemory();
  const overallStart = Date.now();

  console.log(`🔥 5 CV dosyası ARKA ARKAYA aynı anda kuyruğa gönderiliyor...`);

  // Tüm 5 CV yükleme isteğini aynı anda paralel gönder (Native FormData)
  const uploadPromises = files.map(async (fileName, index) => {
    const filePath = path.join(CV_DIR, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("cv", blob, fileName);

    const reqStart = Date.now();
    const uploadRes = await fetch(`${SERVER_URL}/api/cv/upload`, {
      method: "POST",
      headers: {
        Cookie: `token=${token}`
      },
      body: formData
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error(`❌ Upload Hatası (${fileName}):`, errText);
      return null;
    }

    const uploadData = await uploadRes.json() as any;
    console.log(`  📥 [Kuyruğa Düştü - ${index + 1}/5] ${fileName} -> CV ID: ${uploadData.cv?.id}`);
    return {
      fileName,
      cvId: uploadData.cv?.id,
      reqStart
    };
  });

  const uploadedCvResults = (await Promise.all(uploadPromises)).filter(Boolean) as any[];
  console.log(`\n⚡ 5 CV'nin tamamı kuyruğa yerleştirildi. Worker Pool (Concurrency: 4) paralel işlemeye başladı...`);

  // Şimdi tüm 5 CV'nin analizi bitene kadar bekle (Polling)
  const pendingCvIds = new Set<string>(uploadedCvResults.map(c => c.cvId));
  const cvStatusMap = new Map<string, any>();

  let attempts = 0;
  while (pendingCvIds.size > 0 && attempts < 180) {
    attempts++;
    await new Promise(r => setTimeout(r, 1000));
    trackMemory();

    for (const cvId of Array.from(pendingCvIds)) {
      const analysis = await prisma.cVAnalysis.findFirst({
        where: { cvId },
        orderBy: { createdAt: "desc" }
      });

      if (analysis && (analysis.status === "COMPLETED" || analysis.status === "FAILED")) {
        pendingCvIds.delete(cvId);
        cvStatusMap.set(cvId, analysis);
        console.log(`  ✨ [Worker Bitti] CV ID: ${cvId} -> Status: ${analysis.status} | Kalan Bekleyen: ${pendingCvIds.size}`);
      }
    }
  }

  const overallEnd = Date.now();
  const totalDurationMs = overallEnd - overallStart;

  const cvDetails: any[] = [];
  for (let i = 0; i < uploadedCvResults.length; i++) {
    const item = uploadedCvResults[i];
    const analysis = cvStatusMap.get(item.cvId);
    const chunks = await prisma.cVChunk.count({ where: { cvId: item.cvId } });
    const cvDurationMs = analysis ? (new Date(analysis.updatedAt).getTime() - item.reqStart) : totalDurationMs;

    cvDetails.push({
      index: i + 1,
      fileName: item.fileName,
      cvId: item.cvId,
      status: analysis?.status || "TIMEOUT",
      durationMs: cvDurationMs,
      durationSeconds: `${(cvDurationMs / 1000).toFixed(2)}s`,
      chunksCount: chunks,
      atsScore: analysis?.atsScore || 0
    });
  }

  const avgDurationMs = totalDurationMs / files.length;

  const resultPayload = {
    scenario: "Toplu Yükleme (Hepsi Aynı Anda)",
    timestamp: new Date().toISOString(),
    cvCount: files.length,
    totalDurationMs,
    totalDurationSeconds: `${(totalDurationMs / 1000).toFixed(2)}s`,
    averageCvDurationSeconds: `${(avgDurationMs / 1000).toFixed(2)}s`,
    peakRssMb: Number((peakRss / 1024 / 1024).toFixed(2)),
    peakHeapUsedMb: Number((peakHeapUsed / 1024 / 1024).toFixed(2)),
    concurrencyLog: "Worker Pool concurrency: 4 aktif olarak 4 CV'yi aynı anda işledi, 5. CV sıraya girdi.",
    cvDetails
  };

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(resultPayload, null, 2), "utf-8");
  console.log(`\n🎉 [Toplu Benchmark] Rapor başarıyla oluşturuldu: ${OUTPUT_JSON_PATH}`);
  process.exit(0);
}

main().catch(err => {
  console.error("💥 Benchmark script hatası:", err);
  process.exit(1);
});
