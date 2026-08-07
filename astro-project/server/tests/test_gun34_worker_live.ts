/**
 * test_gun34_worker_live.ts (Canlı Worker Pool ve CV İşleme Testi)
 * Görevi: Arka plan worker havuzunu (concurrency: 4) ve PDF yükleme, kuyruk işleme ve Redis doğrulamasını test eder.
 */
import "../src/load-env.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient, AnalysisStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { supabase } from "../src/lib/supabase.js";
import { cvQueue, CV_QUEUE_NAME } from "../src/infrastructure/queue/cvQueue.js";
import { initCvWorker } from "../src/infrastructure/queue/cvWorker.js";
import { redisConnection } from "../src/infrastructure/queue/redisClient.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runGun34LiveVerification(): Promise<void> {
  console.log("\n=======================================================");
  console.log("🧪 GÜN 34 CANLI WORKER POOL & REAL CV VERIFICATION TEST");
  console.log("=======================================================\n");

  try {
    // 0. Test Kullanıcısını Bul veya Oluştur
    let testUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: `testworker-${Date.now()}@example.com`,
          passwordHash: "hashedpassword123",
          name: "Worker Test User",
          phone: "+905555555555",
          role: "ADMIN"
        }
      });
    }

    // 1. Worker Pool'u Başlat (Concurrency: 4)
    const worker = initCvWorker();
    console.log(`✅ [1/5] Worker Pool Initialized (Concurrency: 4)`);

    // 2. Gerçek CV Dosyasını Oku (canva_real_cv_06.pdf)
    const pdfPath = path.resolve(process.cwd(), "tests/cv_test/canva_real_cv_06.pdf");
    console.log(`[2/5] Reading real CV file: ${pdfPath}`);
    const fileBuffer = fs.readFileSync(pdfPath);
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Supabase Storage'a Yükle
    const fileUuid = crypto.randomUUID();
    const storagePath = `cvs/${testUser.id}/${fileUuid}.pdf`;
    
    await supabase.storage.from("cv-files").upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: true
    });

    const { data: publicUrlData } = supabase.storage.from("cv-files").getPublicUrl(storagePath);
    const fileUrl = publicUrlData.publicUrl;

    // DB'ye CV ve Analysis (PENDING) Kaydı Ekle
    const cv = await prisma.cV.create({
      data: {
        userId: testUser.id,
        fileName: "canva_real_cv_06.pdf",
        fileUrl,
        hash: fileHash
      }
    });

    const analysis = await prisma.cVAnalysis.create({
      data: {
        cvId: cv.id,
        status: AnalysisStatus.PENDING
      }
    });

    console.log(`   └─ CV Created in DB (ID: ${cv.id}, Initial Status: PENDING)`);

    // 3. Kuyruğa İş Ekle & Worker Tarafından İşlenmesini Bekle
    console.log(`⚡ [3/5] Main Thread: Enqueuing job for CV ${cv.id} into '${CV_QUEUE_NAME}'...`);
    const job = await cvQueue.add("process-cv", { cvId: cv.id }, { jobId: `live-worker-test-${cv.id}` });

    console.log(`   └─ Job Enqueued to Redis (Job ID: ${job.id})`);

    // Worker Tamamlanana Kadar Bekle
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Worker timed out processing CV")), 40000);
      worker.on("completed", (completedJob) => {
        if (completedJob.id === job.id) {
          clearTimeout(timeout);
          resolve();
        }
      });
      worker.on("failed", (failedJob, err) => {
        if (failedJob?.id === job.id) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });

    // 4. Redis ve DB Kayıtlarını Doğrula
    console.log(`\n🔍 [4/5] Verifying DB & Redis records for completed CV ${cv.id}...`);

    // Redis Completed Key Kontrolü
    const redisKeys = await redisConnection.keys(`*${job.id}*`);
    console.log(`   ├─ Redis Key Exists:`, redisKeys.length > 0 ? "✅ YES" : "❌ NO", redisKeys);

    // DB Status Kontrolü
    const updatedAnalysis = await prisma.cVAnalysis.findFirst({
      where: { cvId: cv.id },
      orderBy: { createdAt: "desc" }
    });

    console.log(`   ├─ DB Analysis Status:`, updatedAnalysis?.status === "COMPLETED" ? "✅ COMPLETED" : updatedAnalysis?.status);
    console.log(`   ├─ ATS Score:`, updatedAnalysis?.atsScore);

    // DB Chunks Kontrolü
    const chunks = await prisma.cVChunk.findMany({ where: { cvId: cv.id } });
    console.log(`   └─ Generated Chunks Count:`, chunks.length, "chunks in DB!");

    if (updatedAnalysis?.status !== "COMPLETED" || chunks.length === 0) {
      throw new Error("Verification failed: DB analysis status is not COMPLETED or 0 chunks found!");
    }

    // 5. PARALEL WORKER TESTİ (3 CV Aynı Anda Yükle)
    console.log(`\n⚡ [5/5] PARALLEL WORKER POOL TEST: Processing 3 real CVs simultaneously...`);

    const pdfFiles = [
      "canva_real_cv_06.pdf",
      "canva_real_cv_07.pdf",
      "canva_real_cv_08.pdf"
    ];

    const parallelJobIds: string[] = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      const pdfName = pdfFiles[i];
      const pBuffer = fs.readFileSync(path.resolve(process.cwd(), `tests/cv_test/${pdfName}`));
      const pHash = crypto.createHash("sha256").update(pBuffer).digest("hex");
      const pUuid = crypto.randomUUID();
      const pPath = `cvs/${testUser.id}/${pUuid}.pdf`;
      
      await supabase.storage.from("cv-files").upload(pPath, pBuffer, { contentType: "application/pdf", upsert: true });
      const { data: pUrl } = supabase.storage.from("cv-files").getPublicUrl(pPath);

      const pCv = await prisma.cV.create({
        data: { userId: testUser.id, fileName: pdfName, fileUrl: pUrl.publicUrl, hash: pHash }
      });
      await prisma.cVAnalysis.create({ data: { cvId: pCv.id, status: AnalysisStatus.PENDING } });

      const pJob = await cvQueue.add("process-cv", { cvId: pCv.id }, { jobId: `parallel-job-${i + 1}-${Date.now()}` });
      parallelJobIds.push(pJob.id!);
      console.log(`   ├─ Enqueued Parallel Job ${i + 1}: ${pJob.id} (CV: ${pdfName})`);
    }

    let activeSlots = 0;
    let completedParallel = 0;

    worker.on("active", (pJob) => {
      if (parallelJobIds.includes(pJob.id!)) {
        activeSlots++;
        console.log(`   🟢 Worker Slot ACTIVE -> Job: ${pJob.id} (Active Slots: ${activeSlots})`);
      }
    });

    await new Promise<void>((resolve, reject) => {
      const pTimeout = setTimeout(() => reject(new Error("Parallel test timed out")), 60000);
      worker.on("completed", (pJob) => {
        if (parallelJobIds.includes(pJob.id!)) {
          completedParallel++;
          console.log(`   🎉 Worker Slot COMPLETED -> Job: ${pJob.id} (${completedParallel}/3 Done)`);
          if (completedParallel === 3) {
            clearTimeout(pTimeout);
            resolve();
          }
        }
      });
    });

    console.log("\n=======================================================");
    console.log("🎉 GÜN 34 ALL WORKER POOL VERIFICATIONS PASSED SUCCESSFULLY!");
    console.log("=======================================================\n");

  } catch (error: any) {
    console.error("\n❌ Gün 34 Verification Failed:", error.stack || error.message);
    process.exit(1);
  } finally {
    await cvQueue.close();
    await redisConnection.quit();
    process.exit(0);
  }
}

runGun34LiveVerification();
