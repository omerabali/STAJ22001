/**
 * EmbeddingService.ts (OpenAI Vektör Dönüştürme Motoru)
 * Görevi: Düz metinleri (CV parçaları veya Arama Sorguları) OpenAI `text-embedding-3-small` modeline göndererek
 * 1536 elemanlı sayısal vektör dizilerine (float array) dönüştürür.
 * 
 * 💡 Neden Çok Kritik?:
 * Yapay zeka arama motorumuzun temelidir. Metinleri anlam boyutunda haritalandırır.
 * 1. Otomatik Hata Yönetimi (Retry Policy): Ağ kesintilerinde 4 defaya kadar üstel bekleme (exponential backoff) ile tekrar dener.
 * 2. Sayaç & Maliyet Takibi: API çağrı sayısını ve harcanan token maliyetlerini kaydeder.
 */
import OpenAI from "openai";

export class EmbeddingService {
  private static openai: OpenAI | null = null;
  public static apiCallCount = 0; // In-memory API call counter for cache verification

  private static getClient(): OpenAI {
    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("[EmbeddingService] OPENAI_API_KEY environment variable is missing.");
      }
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: 15000,
        maxRetries: 3,
      });
    }
    return this.openai;
  }

  /**
   * Generates a 1536-dimensional vector embedding for the given text.
   * Uses the text-embedding-3-small model.
   *
   * @param text The input string to embed.
   * @param prisma Optional PrismaClient instance to log API call usage.
   * @returns A promise resolving to an array of 1536 floats.
   */
  public static async generateEmbedding(text: string, prisma?: any): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("[EmbeddingService] Input text cannot be empty.");
    }

    this.apiCallCount++; // Increment local API call counter
    const client = this.getClient();

    let attempt = 0;
    const maxAttempts = 4;//deneme sayısı
    let delay = 1000; // Start with 1 second

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const response = await client.embeddings.create({
          model: "text-embedding-3-small",
          input: text,
        }, { timeout: 30000 }); // isteğe 30 sn süre

        if (!response.data || response.data.length === 0) {
          throw new Error("Received empty data array from OpenAI API.");
        }

        const promptTokens = response.usage?.prompt_tokens || 0;
        const totalTokens = response.usage?.total_tokens || 0;
        const tokensIn = promptTokens;
        const tokensOut = totalTokens - promptTokens;
        const costUsd = tokensIn * 0.00000002; // $0.02 / 1M tokens

        if (prisma) {
          await prisma.aPICall.create({
            data: {
              model: "text-embedding-3-small",
              tokensIn,
              tokensOut,
              costUsd,
              endpoint: "embedding",
              status: "SUCCESS"
            }
          }).catch((err: any) => console.error("[EmbeddingService] Failed to log API call to database:", err));
        }

        return response.data[0].embedding;
      } catch (error: any) {
        console.error(`[EmbeddingService] Attempt ${attempt} failed:`, error);

        const isRateLimit = error.status === 429 || error.message?.includes("429") || error.message?.includes("Rate limit");
        const isTimeout = error.name === "APITimeoutError" || error.code === "ETIMEDOUT" || error.message?.includes("timeout");

        // If this was the final attempt or a non-retryable error, log FAILED and throw
        if (attempt >= maxAttempts || (!isRateLimit && !isTimeout)) {
          if (prisma) {
            await prisma.aPICall.create({
              data: {
                model: "text-embedding-3-small",
                tokensIn: 0,
                tokensOut: 0,
                costUsd: 0,
                endpoint: "embedding",
                status: "FAILED"
              }
            }).catch((err: any) => console.error("[EmbeddingService] Failed to log failed API call to database:", err));
          }

          if (isRateLimit) {
            throw new Error("[EmbeddingService] OpenAI Rate Limit exceeded after retries. Please slow down requests.");
          } else if (isTimeout) {
            throw new Error("[EmbeddingService] OpenAI API request timed out after retries. Please try again.");
          }
          throw new Error(`[EmbeddingService] OpenAI API Error: ${error.message || error}`);
        }

        // Retry with exponential backoff
        console.log(`[EmbeddingService] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    throw new Error("[EmbeddingService] Unknown error occurred during execution.");
  }
}
