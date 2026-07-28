import { io } from "socket.io-client";

async function testSocketDisconnectScenario() {
  console.log("==================================================");
  console.log("🧪 GÜN 34: Socket.io Bağlantı Kesilme Testi Başlatılıyor...");
  console.log("==================================================");

  const SOCKET_URL = "http://localhost:5000";
  
  const socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 1000
  });

  socket.on("connect", () => {
    console.log(`[Test Client] 🔌 Sunucuya bağlandı! Socket ID: ${socket.id}`);
    
    // Test CV odasına katıl
    const testCvId = "test-cv-gun34";
    socket.emit("join:cv", testCvId);
    console.log(`[Test Client] 📥 cv:${testCvId} odasına katılındı.`);

    // 2 saniye sonra canlı yayın akarken bağlantıyı ZORLA KOPAR
    setTimeout(() => {
      console.log("\n⚡ [SIMULATION] Analiz akışı sırasında ağ/bağlantı kesiliyor! (socket.disconnect)...");
      socket.disconnect();
    }, 2000);
  });

  socket.on("analysis:status", (data) => {
    console.log(`[Test Client] 📡 Canlı Analiz Bildirimi Alındı:`, data);
  });

  socket.on("disconnect", (reason) => {
    console.log(`\n❌ [Test Client] SOCKET BAĞLANTISI KOPTU! Nedeni: "${reason}"`);
    console.log("✅ [Test Client] Bağlantı kesilme (disconnect) olayı başarıyla yakalandı ve loglandı.");
    console.log("==================================================");
    process.exit(0);
  });

  socket.on("connect_error", (error) => {
    console.error(`[Test Client] ⚠️ Bağlantı hatası:`, error.message);
  });
}

testSocketDisconnectScenario();
