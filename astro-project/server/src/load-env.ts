/**
 * env dosyasını okuma işlemi
 * load-env.ts (Ortam Değişkenleri Otomatik Yükleyicisi)
 * Görevi: Sunucu başladığı an en tepede çalışır. Sunucunun geliştirme (development) mi yoksa
 * canlı (production) ortamda mı çalıştığına bakarak ilgili .env dosyasını (.env.development / .env.production)
 * ve varsayılan .env dosyasındaki veritabanı ile API anahtarlarını hafızaya (process.env) yükler.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: path.resolve(__dirname, "..", envFile) });
dotenv.config(); // fallback to standard .env
