/**
 * verify_queue_job.ts (BullMQ Kuyruk & Redis Key Doğrulama Testi)
 * Görevi: Kuyruğa bir iş ekleme ve Redis anahtarlarını kontrol etme işlemlerini doğrular.
 */
import "../src/load-env.js";
import { cvQueue } from "../src/infrastructure/queue/cvQueue.js";
import { redisConnection } from "../src/infrastructure/queue/redisClient.js";

async function verifyQueueJob(): Promise<void> {
  console.log("\n=======================================================");
  console.log("🧪 BULLMQ QUEUE & REDIS KEY VERIFICATION TEST");
  console.log("=======================================================\n");

  try {
    const testCvId = "test-123";
    console.log(`[1/3] Adding job '{ cvId: "${testCvId}" }' to queue 'cv-processing-queue'...`);
    
    const job = await cvQueue.add("process-cv", { cvId: testCvId }, {
      jobId: `verification-job-${Date.now()}`
    });

    console.log(`✅ [2/3] Job added successfully! (Job ID: ${job.id}, Status: Waiting)`);

    console.log(`[3/3] Inspecting Redis keys matching '*cv-processing*' via Redis client...`);
    const keys = await redisConnection.keys("*cv-processing*");

    console.log("\n--- REAL REDIS KEYS FOUND ---");
    keys.forEach((key, idx) => console.log(`   ${idx + 1}. ${key}`));

    if (keys.length > 0) {
      console.log("\n🎉 QUEUE JOB VERIFIED IN REDIS SUCCESSFULLY!\n");
    } else {
      throw new Error("No Redis keys found for queue!");
    }
  } catch (error: any) {
    console.error("❌ Queue Job Verification Failed:", error.message);
    process.exit(1);
  } finally {
    await cvQueue.close();
    await redisConnection.quit();
    process.exit(0);
  }
}

verifyQueueJob();
