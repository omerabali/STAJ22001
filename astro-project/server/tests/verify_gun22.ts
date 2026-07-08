import "../src/load-env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { embedAllChunks, searchSimilarChunks } from "../src/utils/embeddings.js";
import { extractTextFromPDF, chunkTextBySections } from "../src/utils/parser.js";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Prisma with adapter-pg (same as index.ts / cv.ts)
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
  const width = 78;
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
  console.log("\n" + c.cyan + c.bold + "  ██████╗ GÜN 22 - pgvector & HNSW INDEX VE SEMANTIC SEARCH DOĞRULAMA TESTİ" + c.reset);
  console.log(c.gray + "  Model: text-embedding-3-small  |  DB: Supabase PostgreSQL" + c.reset);
  console.log(c.gray + "  ──────────────────────────────────────────────────────────────────────────" + c.reset + "\n");

  let tempUser: any = null;
  let tempCv: any = null;

  try {
    // ── Adım 1: pgvector Extension ve HNSW İndeks Kurulumu / Doğrulaması ─────────────
    console.log("🚀 Adım 1: pgvector Extension ve HNSW İndeks Kontrolü...");
    
    // Enable extension
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS vector;");
    
    // Enable HNSW index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS cv_embeddings_hnsw_idx 
      ON cv_embeddings 
      USING hnsw (embedding vector_cosine_ops);
    `);

    // Verify index exists in database metadata
    const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'cv_embeddings' AND indexname = 'cv_embeddings_hnsw_idx';
    `;
    const indexExists = indexes.length > 0;

    // Verify vector column type in postgres catalog
    const columns = await prisma.$queryRaw<{ data_type: string; udt_name: string }[]>`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'cv_embeddings' AND column_name = 'embedding';
    `;
    const isVectorType = columns[0]?.udt_name === "vector";

    drawBox("1 · Database Extension & Index Doğrulaması", [
      `${c.gray}pgvector Uzantısı   : ${c.green}AKTİF (vector)${c.reset}`,
      `${c.gray}embedding Sütun Tipi : ${isVectorType ? c.green + "vector (1536 Boyut)" : c.yellow + "Geçersiz (" + columns[0]?.udt_name + ")"}${c.reset}`,
      `${c.gray}HNSW İndeks Durumu   : ${indexExists ? c.green + "HAZIR (cv_embeddings_hnsw_idx)" : c.yellow + "EKSİK"}${c.reset}`,
      `${c.gray}Durum                : ${isVectorType && indexExists ? c.green + "🎉 ONAYLANDI (Vektör Araması İçin Optimize Edildi)" : c.yellow + "❌ EKSİK PARAMETRELER"}${c.reset}`
    ]);
    console.log();

    // ── Adım 2: E2E Pipeline PDF Okuma & Veritabanı Kayıt Testi ────────────────────
    console.log("🚀 Adım 2: test_cv.pdf Okuma, Ayrıştırma ve pgvector Vektörleştirme...");

    const pdfPath = path.resolve(__dirname, "fixtures/test_cv.pdf");
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`test_cv.pdf fixtures klasöründe bulunamadı: ${pdfPath}`);
    }

    // 2.1 Temp Aday Kullanıcısı ve CV kaydı oluştur (İlişkisel bütünlük için)
    tempUser = await prisma.user.findFirst({ where: { role: "CANDIDATE" } });
    if (!tempUser) {
      tempUser = await prisma.user.create({
        data: {
          email: `temp-candidate-${Date.now()}@example.com`,
          password: "temp-hashed-password",
          name: "Test Candidate",
          role: "CANDIDATE"
        }
      });
    }

    const fileBuffer = fs.readFileSync(pdfPath);
    const rawText = await extractTextFromPDF(fileBuffer);
    const parsedChunks = await chunkTextBySections(rawText);

    tempCv = await prisma.cV.create({
      data: {
        userId: tempUser.id,
        fileName: "verify_gun22_temp_cv.pdf",
        fileUrl: "https://example.com/verify_gun22_temp_cv.pdf",
        hash: crypto.createHash("sha256").update(fileBuffer).digest("hex"),
        metadata: { chunksCount: parsedChunks.length }
      }
    });

    // Save chunks to cv_chunks
    await prisma.cVChunk.createMany({
      data: parsedChunks.map((chunk, idx) => ({
        cvId: tempCv.id,
        chunkText: chunk.chunkText,
        chunkIndex: idx + 1,
        metadata: chunk.metadata || {}
      }))
    });

    console.log(`${c.purple}Parsed Chunks from PDF:${c.reset}`);
    parsedChunks.forEach((ch, idx) => {
      console.log(`  [Chunk ${idx + 1}] ${c.gray}${ch.chunkText.slice(0, 100).replace(/\n/g, " ")}...${c.reset}`);
    });
    console.log();

    // 2.2 Run DB pipeline
    console.log("📥 Pipeline çalıştırılıyor (Ham SQL ile Vektörler Yazılıyor)...");
    const result1 = await embedAllChunks(tempCv.id, prisma);

    // Verify row count in DB
    const savedEmbeddingsCountResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM cv_embeddings WHERE "chunkId" IN (
        SELECT id FROM cv_chunks WHERE "cvId" = ${tempCv.id}
      )
    `;
    const savedCount = Number(savedEmbeddingsCountResult[0]?.count || 0);

    drawBox("2 · PDF Vektörleştirme ve Veritabanı Kayıt Sonucu", [
      `${c.gray}Oluşturulan Chunk   : ${c.white}${parsedChunks.length} adet${c.reset}`,
      `${c.gray}Üretilen Embedding   : ${c.bold}${c.white}${result1.embedded} adet${c.reset}`,
      `${c.gray}Önbellekten Alınan   : ${c.bold}${c.white}${result1.copied} adet${c.reset}`,
      `${c.gray}DB'de Doğrulanan Satır: ${c.green}${savedCount} adet${c.reset}`,
      `${c.gray}Durum                : ${savedCount === parsedChunks.length ? c.green + "🎉 BAŞARILI (Tüm Vektörler pgvector'a Yazıldı)" : c.yellow + "❌ EKSİK KAYIT"}${c.reset}`
    ]);
    console.log();

    // ── Adım 3: Kosinüs Benzerliği (Cosine Distance) ile Semantic Search ─────────────
    console.log("🚀 Adım 3: pgvector Cosine Similarity Anlamsal Arama Sorgusu...");

    const searchQuery = "Kırklareli Üniversitesi Yazılım Mühendisliği";
    console.log(`🔍 Arama Sorgusu: "${c.white}${searchQuery}${c.reset}"`);
    const searchResults = await searchSimilarChunks(searchQuery, 3, prisma, tempCv.id);

    const resultLines = searchResults.map((res, idx) => {
      const preview = res.chunkText.slice(0, 60).replace(/\n/g, " ") + "...";
      const similarityPercent = (res.similarity * 100).toFixed(2);
      return `${c.bold}${c.white}${idx + 1}. [Benzerlik: %${similarityPercent}]${c.reset} ${preview}`;
    });

    const isMatchSuccessful = searchResults.length > 0 && searchResults[0].similarity > 0.6;

    drawBox("3 · Anlamsal Benzerlik Arama Sonuçları", [
      ...resultLines,
      "",
      `${c.gray}En Yüksek Benzerlik: ${c.white}%${(searchResults[0]?.similarity * 100 || 0).toFixed(2)}${c.reset}`,
      `${c.gray}Eşleşen Metin Önizl.: ${c.white}"${searchResults[0]?.chunkText.slice(0, 100).replace(/\n/g, " ")}..."${c.reset}`,
      `${c.gray}Durum                : ${isMatchSuccessful ? c.green + "🎉 BAŞARILI (Anlamsal Eşleşme Doğrulandı)" : c.yellow + "❌ EŞLEŞME BAŞARISIZ"}${c.reset}`
    ]);

  } catch (error) {
    console.error(c.yellow + "❌ Test sırasında beklenmeyen hata:" + c.reset, error);
  } finally {
    // ── Temizlik Aşaması ──────────────────────────────────────────────────────────
    console.log("\n🧹 Geçici test verileri temizleniyor...");
    if (tempCv) {
      await prisma.cV.delete({ where: { id: tempCv.id } }).catch(() => {});
    }
    // Pool kapatılıyor
    await pool.end();
  }

  console.log("\n" + c.green + c.bold + "  ✅  Gün 22 Veritabanı ve pgvector Doğrulama testi tamamlandı." + c.reset + "\n");
}

run();
