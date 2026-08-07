/**
 * verify_redis_connection.ts (Redis Bağlantı & SET/GET Doğrulama Testi)
 * Görevi: Redis veritabanına doğrudan okuma/yazma (SET/GET) işlemi yaparak bağlantıyı test eder.
 */
import "../src/load-env.js";
import { redisConnection } from "../src/infrastructure/queue/redisClient.js";

async function testRedisConnection(): Promise<void> {
  console.log("\n=======================================================");
  console.log("🧪 REDIS CONNECTION VERIFICATION TEST (SET / GET)");
  console.log("=======================================================\n");

  try {
    const testKey = "beacon:test:ping";
    const testValue = `pong-${Date.now()}`;

    // 1. SET Testi
    console.log(`[1/3] Writing key '${testKey}' with value '${testValue}'...`);
    await redisConnection.set(testKey, testValue, "EX", 30); // 30s TTL

    // 2. GET Testi
    console.log(`[2/3] Reading key '${testKey}' back from Redis...`);
    const readValue = await redisConnection.get(testKey);

    if (readValue === testValue) {
      console.log(`✅ [3/3] SET/GET Verification SUCCESSFUL! Value matched: '${readValue}'`);
      console.log("\n🎉 REDIS CONNECTION IS FULLY FUNCTIONAL!\n");
    } else {
      throw new Error(`Value mismatch! Expected '${testValue}', got '${readValue}'`);
    }
  } catch (error: any) {
    console.error("❌ Redis Connection Test Failed:", error.message);
    process.exit(1);
  } finally {
    await redisConnection.quit();
    process.exit(0);
  }
}

testRedisConnection();
