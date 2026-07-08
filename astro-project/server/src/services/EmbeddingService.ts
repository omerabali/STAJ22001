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
   * @returns A promise resolving to an array of 1536 floats.
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error("[EmbeddingService] Input text cannot be empty.");
    }

    this.apiCallCount++; // Increment local API call counter
    const client = this.getClient();

    try {
      const response = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("[EmbeddingService] Received empty data array from OpenAI API.");
      }

      return response.data[0].embedding;
    } catch (error: any) {
      console.error("[EmbeddingService] Error generating embedding:", error);

      if (error.status === 429) {
        throw new Error("[EmbeddingService] OpenAI Rate Limit exceeded. Please slow down requests.");
      } else if (error.name === "APITimeoutError" || error.code === "ETIMEDOUT") {
        throw new Error("[EmbeddingService] OpenAI API request timed out. Please try again.");
      }

      throw new Error(`[EmbeddingService] OpenAI API Error: ${error.message || error}`);
    }
  }
}
