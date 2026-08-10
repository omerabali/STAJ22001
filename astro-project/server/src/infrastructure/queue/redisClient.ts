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

function createRedisInstance() {
  // 1. Eğer REDIS_HOST tanımlıysa (Upstash / Cloud Redis)
  if (process.env.REDIS_HOST && process.env.REDIS_HOST !== "localhost") {
    return new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      password: process.env.REDIS_PASSWORD,
      username: "default",
      tls: {}, // Upstash TLS zorunludur
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  // 2. Eğer tek parça REDIS_URL tanımlıysa
  if (redisUrl) {
    const isRediss = redisUrl.startsWith("rediss://");
    return new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: isRediss ? { rejectUnauthorized: false } : undefined,
    });
  }

  // 3. Lokal Docker Fallback
  return new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export const redisConnection = createRedisInstance();

redisConnection.on("connect", () => {
  console.log(`[Redis] 🟢 Connected to Redis at ${redisUrl || `${redisHost}:${redisPort}`}`);
});

redisConnection.on("error", (err) => {
  console.error("[Redis] 🔴 Redis Connection Error:", err.message);
});
