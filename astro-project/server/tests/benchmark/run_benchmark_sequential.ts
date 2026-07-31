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
const OUTPUT_JSON_PATH = path.join(BENCHMARK_DIR, "benchmark_sequential_upload.json");
const SERVER_URL = "http://localhost:5000";

if (!fs.existsSync(BENCHMARK_DIR)) {
  fs.mkdirSync(BENCHMARK_DIR, { recursive: true });
}

async function cleanupBenchmarkCvs(fileNames: string[], userId: string) {
  console.log("🧹 [Sıralı Benchmark] DB ve depolamadaki eski test CV'leri temizleniyor...");
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
  console.log("🚀 SENARYO 1 — SIRALI YÜKLEME BENCHMARK TESTİ (TEK TEK)");
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
  const cvDetails: any[] = [];

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(CV_DIR, fileName);
    console.log(`\n▶️ [CV ${i + 1}/5] Yükleniyor: ${fileName}`);

    const cvStart = Date.now();
    trackMemory();

    // 1. HTTP Upload İsteği Gönder (Native FormData + Blob)
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: "application/pdf" });
    const formData = new FormData();
    formData.append("cv", blob, fileName);

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
      continue;
    }

    const uploadData = await uploadRes.json() as any;
    const cvId = uploadData.cv?.id;
    console.log(`  📥 Yüklendi! CV ID: ${cvId}. Analiz tamamlanması bekleniyor...`);

    // 2. Analizin COMPLETED olmasını bekle (Polling)
    let isCompleted = false;
    let attempts = 0;
    let finalAnalysis: any = null;

    while (!isCompleted && attempts < 120) {
      attempts++;
      await new Promise(r => setTimeout(r, 1000));
      trackMemory();

      const analysis = await prisma.cVAnalysis.findFirst({
        where: { cvId },
        orderBy: { createdAt: "desc" }
      });

      if (analysis && (analysis.status === "COMPLETED" || analysis.status === "FAILED")) {
        isCompleted = true;
        finalAnalysis = analysis;
      }
    }

    const cvEnd = Date.now();
    const durationMs = cvEnd - cvStart;

    const chunks = await prisma.cVChunk.count({ where: { cvId } });

    console.log(`  ✅ CV ${i + 1} Tamamlandı! Durum: ${finalAnalysis?.status} | Süre: ${(durationMs / 1000).toFixed(1)}s | Chunk: ${chunks} | ATS: %${finalAnalysis?.atsScore || 0}`);

    cvDetails.push({
      index: i + 1,
      fileName,
      cvId,
      status: finalAnalysis?.status || "TIMEOUT",
      durationMs,
      durationSeconds: `${(durationMs / 1000).toFixed(2)}s`,
      chunksCount: chunks,
      atsScore: finalAnalysis?.atsScore || 0
    });
  }

  const overallEnd = Date.now();
  const totalDurationMs = overallEnd - overallStart;
  const avgDurationMs = totalDurationMs / files.length;

  const resultPayload = {
    scenario: "Sıralı Yükleme (Tek Kullanıcı, Döngü)",
    timestamp: new Date().toISOString(),
    cvCount: files.length,
    totalDurationMs,
    totalDurationSeconds: `${(totalDurationMs / 1000).toFixed(2)}s`,
    averageCvDurationSeconds: `${(avgDurationMs / 1000).toFixed(2)}s`,
    peakRssMb: Number((peakRss / 1024 / 1024).toFixed(2)),
    peakHeapUsedMb: Number((peakHeapUsed / 1024 / 1024).toFixed(2)),
    cvDetails
  };

  fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(resultPayload, null, 2), "utf-8");
  console.log(`\n🎉 [Sıralı Benchmark] Rapor başarıyla oluşturuldu: ${OUTPUT_JSON_PATH}`);
  process.exit(0);
}

main().catch(err => {
  console.error("💥 Benchmark script hatası:", err);
  process.exit(1);
});
