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
  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      const isSecure = parsed.protocol === "rediss:";
      return new Redis({
        host: parsed.hostname,
        port: parseInt(parsed.port || "6379", 10),
        password: decodeURIComponent(parsed.password || parsed.username || ""),
        tls: isSecure ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
    } catch (e) {
      return new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
      });
    }
  }

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
