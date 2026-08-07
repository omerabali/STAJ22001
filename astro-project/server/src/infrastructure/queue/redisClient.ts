/**
 * redisClient.ts (Redis Bağlantı Yöneticisi)
 * Görevi: `ioredis` kütüphanesini kullanarak Redis veritabanı ile tekil (Singleton) bağlantı kurar.
 * BullMQ iş kuyruğunun ve vektör/önbellek sistemlerinin Redis iletişimini yürütür.
 */
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisConnection = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  : new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

redisConnection.on("connect", () => {
  console.log(`[Redis] 🟢 Connected to Redis at ${redisUrl || `${redisHost}:${redisPort}`}`);
});

redisConnection.on("error", (err) => {
  console.error("[Redis] 🔴 Redis Connection Error:", err.message);
});
