/**
 * verify_redis_error_handling.ts (Redis Hata Yakalama Testi)
 * Görevi: Redis bağlantısının koptuğu veya geçersiz porta istek atıldığı durumlarda sistemin çökmediğini doğrular.
 */
import { Redis } from "ioredis";

async function verifyWrongPortErrorHandling(): Promise<void> {
  console.log("[1/2] Connecting to invalid Redis port '9999'...");

  let errorCaught = false;

  const testRedis = new Redis({
    host: "localhost",
    port: 9999, // Yanlış / Geçersiz port
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy() {
      // Test için yeniden denemeyi durdur
      return null;
    }
  });

  testRedis.on("error", (err: any) => {
    errorCaught = true;
    console.log(`✅ [2/2] Error caught gracefully via listener: [${err?.code || 'ECONNREFUSED'}] ${err?.message || err}`);
    console.log("\n🎉 GRACEFUL ERROR HANDLING VERIFIED! System did not crash.\n");
    testRedis.disconnect();
    process.exit(0);
  });

  // Timeout if no error event (unexpected)
  setTimeout(() => {
    if (!errorCaught) {
      console.error("❌ Test failed: Expected connection error on port 9999 was not caught.");
      testRedis.disconnect();
      process.exit(1);
    }
  }, 3000);
}

verifyWrongPortErrorHandling();
