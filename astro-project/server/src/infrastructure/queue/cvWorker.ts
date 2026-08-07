/**
 * cvWorker.ts (BullMQ İşçi Havuzu - Worker Pool)
 * Görevi: Arka planda 4 eşzamanlı kanalla (concurrency: 4) Redis kuyruğunu dinleyen işçi motorudur.
 * Kuyruğa düşen CV işlerini çeker ve `ProcessCvPipelineUseCase` boru hattını çalıştırarak CV analizi yapar.
 */
import "../../load-env.js";
import { Worker, Job } from "bullmq";
import { PrismaClient, AnalysisStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { redisConnection } from "./redisClient.js";
import { CV_QUEUE_NAME } from "./cvQueue.js";
import { ProcessCvPipelineUseCase } from "../../application/cv/ProcessCvPipelineUseCase.js";
import { emitAnalysisStatus } from "../../index.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export interface CvJobData {
  cvId: string;
}

let workerInstance: Worker | null = null;//tek bir worker örneği oluşturuyoruz yani 4 işi aynı anda yapabilecek olan eleman 


export function initCvWorker(): Worker {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker<CvJobData>(
    CV_QUEUE_NAME,//bu kuyruğu nöbetçi gibi izler
    async (job: Job<CvJobData>) => {
      const { cvId } = job.data;
      console.log(`[Worker Pool] ⚙️ Processing Job ID: ${job.id} for CV ID: ${cvId}`);

      try {
        // Job durumu: ACTIVE (Worker devraldı)
        emitAnalysisStatus(cvId, "PROCESSING", "Worker CV işleme boru hattını başlattı...", 1);

        // Ana boru hattını çalıştır
        await ProcessCvPipelineUseCase.execute(cvId, prisma);//ana işlem mekanizmamızdır 
      } catch (err: any) {
        console.error(`[Worker Pool] 💥 Error processing job ${job.id} for CV ${cvId}:`, err);
        emitAnalysisStatus(cvId, "FAILED", `İşlem hatası: ${err?.message || "Bilinmeyen hata"}`, 0);//önyüz bildirgelerinin yapıldığı kısım
        throw err;
      }
    },
    {
      connection: redisConnection,
      concurrency: 4 // Sabit 4 paralel worker thread slotu
    }
  );
  //bullmq işçisi nöbet tutar diyelim herhangi değişiklikte socket ile de durum değişimini yaparız
  workerInstance.on("active", async (job: Job<CvJobData>) => {
    const cvId = job.data.cvId;
    console.log(`[Worker Pool] 🔵 Job ${job.id} (CV: ${cvId}) is now ACTIVE.`);
    try {
      await prisma.cVAnalysis.updateMany({
        where: { cvId, status: { in: [AnalysisStatus.PENDING] } },
        data: { status: AnalysisStatus.PROCESSING }
      }).catch(() => { });
      emitAnalysisStatus(cvId, "PROCESSING", "İşlem aktif duruma geçti (Worker devraldı)...", 1);
    } catch { }
  });

  workerInstance.on("completed", async (job: Job<CvJobData>) => {
    const cvId = job.data.cvId;
    console.log(`[Worker Pool] ✅ Job ${job.id} (CV: ${cvId}) COMPLETED successfully.`);
    try {
      await prisma.cVAnalysis.updateMany({
        where: { cvId, status: { in: [AnalysisStatus.PROCESSING, AnalysisStatus.PENDING] } },
        data: { status: AnalysisStatus.COMPLETED }
      }).catch(() => { });
      emitAnalysisStatus(cvId, "COMPLETED", "CV analizi başarıyla tamamlandı.", 4);
    } catch { }
  });

  workerInstance.on("failed", async (job: Job<CvJobData> | undefined, err: Error) => {
    const cvId = job?.data?.cvId;
    console.error(`[Worker Pool] ❌ Job ${job?.id} (CV: ${cvId}) FAILED:`, err.stack || err.message);
    if (cvId) {
      try {
        await prisma.cVAnalysis.updateMany({
          where: { cvId, status: { in: [AnalysisStatus.PROCESSING, AnalysisStatus.PENDING] } },
          data: { status: AnalysisStatus.FAILED }
        }).catch(() => { });
        emitAnalysisStatus(cvId, "FAILED", `Analiz hatası: ${err.message}`, 0);
      } catch { }
    }
  });

  console.log(`[Worker Pool] 👷 Worker initialized with concurrency: 4 on queue '${CV_QUEUE_NAME}'`);
  return workerInstance;
}
