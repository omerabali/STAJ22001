import { cvQueue, CV_QUEUE_NAME } from "../infrastructure/queue/cvQueue.js";
import { redisConnection } from "../infrastructure/queue/redisClient.js";

async function verifyGun33BullMQ(): Promise<void> {
  console.log("\n=======================================================");
  console.log("🧪 GÜN 33 VERIFICATION TEST: BullMQ + Redis Setup");
  console.log("=======================================================\n");

  try {
    // 1. Redis Ping Testi
    const pingResult = await redisConnection.ping();
    console.log(`✅ [1/3] Redis Connection Test: PING -> ${pingResult}`);

    // 2. Queue Job Ekleme Testi (Retry Policy kontrolü)
    const testCvId = `test-cv-${Date.now()}`;
    const job = await cvQueue.add("process-cv", { cvId: testCvId }, {
      jobId: `test-job-${Date.now()}`
    });

    console.log(`✅ [2/3] BullMQ Job Created! ID: ${job.id}, Queue: ${CV_QUEUE_NAME}`);
    console.log(`   - Max Attempts: ${job.opts.attempts}`);
    console.log(`   - Backoff Policy:`, job.opts.backoff);

    // 3. Kuyruktan Job Bilgisini Oku ve Temizle
    const fetchedJob = await cvQueue.getJob(job.id!);
    if (fetchedJob) {
      console.log(`✅ [3/3] BullMQ Job Verified in Redis: ${fetchedJob.data.cvId}`);
      await fetchedJob.remove();
      console.log("🧹 Test job cleaned up.");
    }

    console.log("\n🎉 GÜN 33 BULLMQ + REDIS SETUP SUCCESSFUL!\n");
  } catch (error: any) {
    console.error("❌ Gün 33 Verification Failed:", error.message);
    process.exit(1);
  } finally {
    await cvQueue.close();
    await redisConnection.quit();
    process.exit(0);
  }
}

verifyGun33BullMQ();
