import "../src/load-env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EmbeddingService } from "../src/services/EmbeddingService.js";
import { embedAllChunksInMemory, clearInMemoryCache, computeHash } from "../src/utils/embeddings.js";
import { extractTextFromPDF, chunkTextBySections } from "../src/utils/parser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konsol renk tanımları
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  purple: "\x1b[35m"
};

function drawBox(title: string, lines: string[]) {
  const width = 76;
  console.log(c.purple + "╔" + "═".repeat(width) + "╗" + c.reset);
  console.log(c.purple + "║" + c.bold + c.white + `  ${title.padEnd(width - 4)}` + c.purple + "  ║" + c.reset);
  console.log(c.purple + "╟" + "─".repeat(width) + "╢" + c.reset);
  for (const line of lines) {
    const plain = line.replace(/\x1b\[[0-9;]*m/g, "");
    const padding = Math.max(0, width - plain.length - 2);
    console.log(c.purple + "║" + c.reset + ` ${line}` + " ".repeat(padding) + c.purple + "║" + c.reset);
  }
  console.log(c.purple + "╚" + "═".repeat(width) + "╝" + c.reset);
}

async function run() {
  console.log("\n" + c.cyan + c.bold + "  ██████╗ GÜN 21 - EMBEDDING KURULUMU VE IN-MEMORY PIPELINE TESTİ" + c.reset);
  console.log(c.gray + "  Model: text-embedding-3-small  |  DB/Prisma: Bypassed (Hafıza Üzerinde)" + c.reset);
  console.log(c.gray + "  ────────────────────────────────────────────────────────────────────────" + c.reset + "\n");

  try {
    // ── Adım 0: PDF Dosyasını Oku ve Ayrıştır ─────────────────────────────────────
    const pdfPath = path.resolve(__dirname, "fixtures/test_cv.pdf");
    let mockChunks: string[] = [];
    let pdfFileName = "fixtures/test_cv.pdf";

    if (fs.existsSync(pdfPath)) {
      console.log(`📄 PDF dosyası okunuyor ve ayrıştırılıyor: ${c.white}${pdfFileName}${c.reset}`);
      const fileBuffer = fs.readFileSync(pdfPath);
      const rawText = await extractTextFromPDF(fileBuffer);
      const parsedChunks = await chunkTextBySections(rawText);
      mockChunks = parsedChunks.map(ch => ch.chunkText);
      console.log(`✅ PDF başarıyla ayrıştırıldı. ${c.bold}${c.white}${mockChunks.length}${c.reset} adet chunk üretildi.\n`);
    } else {
      console.log(c.yellow + "⚠️ test_cv.pdf bulunamadı. Statik mock veriler kullanılacak." + c.reset);
      mockChunks = [
        "[KİŞİSEL BİLGİLER] Ömer Abalı, email: omer@example.com",
        "[EĞİTİM] Boğaziçi Üniversitesi Bilgisayar Mühendisliği",
        "[YETENEKLER] Node.js, TypeScript, PostgreSQL, AI"
      ];
      pdfFileName = "Statik Mock Veri";
    }

    if (mockChunks.length === 0) {
      console.log(c.yellow + "❌ İşlenecek chunk bulunamadı!" + c.reset);
      return;
    }

    // ── Adım 1: Tek Chunk İçin OpenAI Embedding Testi ───────────────────────────
    console.log("🚀 Adım 1: OpenAI API & Tekli Chunk Embedding Doğrulaması...");
    const sampleText = mockChunks[0];
    const chunkPreview = sampleText.slice(0, 50).replace(/\n/g, " ") + "...";
    const singleVector = await EmbeddingService.generateEmbedding(sampleText);
    const sizeOk = singleVector.length === 1536;

    drawBox("1 · Tek Chunk OpenAI Entegrasyon Sonucu", [
      `${c.gray}Dosya Kaynağı  : ${c.white}${pdfFileName}${c.reset}`,
      `${c.gray}Test Metni     : ${c.white}"${chunkPreview}"${c.reset}`,
      `${c.gray}Vektör Boyutu  : ${c.bold}${c.white}${singleVector.length} boyut${c.reset}`,
      `${c.gray}Durum          : ${sizeOk ? c.green + "🎉 ONAYLANDI (1536 Boyut Doğru)" : c.yellow + "❌ HATA"}${c.reset}`
    ]);
    console.log();

    // ── Adım 2: In-Memory Pipeline (embedAllChunks) Testi ──────────────────────
    console.log("🚀 Adım 2: In-Memory Pipeline & SHA-256 Cache Kontrolü...");
    
    // Test verilerini temizle
    clearInMemoryCache();
    EmbeddingService.apiCallCount = 0;

    // İlk Yükleme (Cache Boş - OpenAI API Çağrılmalı)
    console.log("\n📥 [İlk İşleme] Chunks pipeline üzerinden asenkron embed ediliyor...");
    const result1 = await embedAllChunksInMemory(mockChunks);

    drawBox("2 · İlk Yükleme Sonuçları (Cache Boş)", [
      `${c.gray}Dosya Kaynağı  : ${c.white}${pdfFileName}${c.reset}`,
      `${c.gray}Toplam Chunk    : ${c.white}${mockChunks.length} adet${c.reset}`,
      `${c.gray}API ile Üretilen: ${c.bold}${c.white}${result1.embedded} adet${c.reset}`,
      `${c.gray}Önbellekten     : ${c.bold}${c.white}${result1.copied} adet${c.reset}`,
      `${c.gray}API Çağrı Sayısı: ${c.bold}${c.white}${EmbeddingService.apiCallCount} kez${c.reset}`,
      `${c.gray}Durum           : ${result1.embedded === mockChunks.length ? c.green + "🎉 BAŞARILI (Birebir Eşleşiyor)" : c.yellow + "❌ HATA"}${c.reset}`
    ]);
    console.log();

    // İkinci Yükleme (Mükerrer Veri - OpenAI API Çağrısı Yapılmamalı, Tamamı Cache'den Kopyalanmalı)
    console.log("📥 [Mükerrer Yükleme] Aynı chunks tekrar gönderiliyor (Önbellek Kontrolü)...");
    const apiCallCountBefore = EmbeddingService.apiCallCount;
    const result2 = await embedAllChunksInMemory(mockChunks);
    const apiCallDiff = EmbeddingService.apiCallCount - apiCallCountBefore;

    const firstChunkHash = computeHash(mockChunks[0]);

    drawBox("3 · Mükerrer Yükleme & Cache Sonuçları", [
      `${c.gray}Dosya Kaynağı  : ${c.white}${pdfFileName}${c.reset}`,
      `${c.gray}Toplam Chunk    : ${c.white}${mockChunks.length} adet${c.reset}`,
      `${c.gray}API ile Üretilen: ${c.bold}${c.white}${result2.embedded} adet (Beklenen: 0)${c.reset}`,
      `${c.gray}Önbellekten     : ${c.bold}${c.green}${result2.copied} adet (Beklenen: ${mockChunks.length})${c.reset}`,
      `${c.gray}Yapılan API İst.: ${c.bold}${c.white}${apiCallDiff} kez (Beklenen: 0)${c.reset}`,
      `${c.gray}İlk Chunk Hash  : ${c.white}${firstChunkHash.slice(0, 24)}...${c.reset}`,
      `${c.gray}Önbellek Durumu : ${result2.copied === mockChunks.length && apiCallDiff === 0 ? c.green + "🎉 BAŞARILI (Tüm Veriler Önbellekten Alındı)" : c.yellow + "❌ HATA"}${c.reset}`
    ]);

  } catch (error) {
    console.error(c.yellow + "❌ Test sırasında beklenmeyen hata:" + c.reset, error);
  }

  console.log("\n" + c.green + c.bold + "  ✅  Gün 21 In-Memory Doğrulama testi tamamlandı." + c.reset + "\n");
}

run();
