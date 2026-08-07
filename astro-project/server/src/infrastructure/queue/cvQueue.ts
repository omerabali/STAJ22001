/**
 * cvQueue.ts (BullMQ CV İşleme İş Kuyruğu)
 * Görevi: `cv-processing-queue` adında arka plan iş kuyruğunu tanımlar.
 * Yüklenen CV'leri sıraya alır. Hata durumunda 3 defaya kadar katlanarak artan bekleme (exponential backoff: 2s, 4s, 8s) ile yeniden dener.
 */
import { Queue } from "bullmq";
import { redisConnection } from "./redisClient.js";

export const CV_QUEUE_NAME = "cv-processing-queue";


export const cvQueue = new Queue(CV_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000 // 2s, 4s, 8s...   herhangibi bir hata durumunda deneme süremiz katlanarak devam edet
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 }
  }
});

console.log(`[BullMQ] 🚀 ${CV_QUEUE_NAME} initialized with retry policy (attempts: 3, exponential backoff).`);
