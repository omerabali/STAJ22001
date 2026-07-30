import { Queue } from "bullmq";
import { redisConnection } from "./redisClient.js";

export const CV_QUEUE_NAME = "cv-processing-queue";


export const cvQueue = new Queue(CV_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000 // 2s, 4s, 8s...
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 }
  }
});

console.log(`[BullMQ] 🚀 ${CV_QUEUE_NAME} initialized with retry policy (attempts: 3, exponential backoff).`);
