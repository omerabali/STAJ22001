/**
 * rateLimiter.ts (DDoS & Aşırı Yükleme Koruması / Rate Limiting Middleware)
 * Görevi: Kötü niyetli kullanıcıların veya botların sistemi çökertmesini,
 * OpenAI API maliyetlerini patlatmasını ve sunucuyu kilitlemesini engeller.
 */
import rateLimit from "express-rate-limit";

/**
 * 1. Genel API Limiti (Örn: Dakikada maksimum 100 istek)
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  limit: 300, // 15 dakikada IP başına max 300 istek
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin."
  }
});

/**
 * 2. Hassas Arama Limiti (Semantik LLM Aramaları - Dakikada max 20 arama)
 */
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  limit: 20, // 1 dakikada max 20 arama
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Arama limitini aştınız! Sistem güvenliği için lütfen 1 dakika bekleyin."
  }
});

/**
 * 3. CV Yükleme & Analiz Limiti (Yapay Zeka İşleme - Dakikada max 10 CV)
 */
export const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  limit: 10, // 1 dakikada max 10 dosya yükleme/işleme
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Kısa sürede çok fazla CV yüklediniz. Lütfen 1 dakika bekleyin."
  }
});

/**
 * 4. Auth (Giriş & Kayıt) Limiti (Brute-Force Koruması)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  limit: 15, // 15 dakikada max 15 giriş/deneme
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Çok fazla başarısız giriş denemesi. Hesabınız 15 dakika korumaya alındı."
  }
});
