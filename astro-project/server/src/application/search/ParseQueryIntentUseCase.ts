import { PrismaClient } from "@prisma/client";
import { ParsedQuery } from "../../domain/search/HardRequirement.js";
import { OpenAIQueryParser } from "../../infrastructure/ai/OpenAIQueryParser.js";

export class ParseQueryIntentUseCase {
  /**
   * Executes query intent parsing with strict multi-level silent fallback.
   * Never throws errors or stops application execution.
   */
  public static async execute(
    queryText: string,
    prisma: PrismaClient
  ): Promise<ParsedQuery> {
    const trimmed = (queryText || "").trim();

    // ADIM 3: Ön Kontroller — Sorgu boş veya 3 karakterden kısaysa HİÇ ÇAĞIRMA
    if (!trimmed || trimmed.length < 3) {
      console.log(`[ParseQueryIntentUseCase] Query too short (<3 chars), skipping AI intent parsing.`);
      return { hardRequirements: [], softContext: trimmed };
    }

    try {
      // ADIM 1 & 2: Infrastructure çağrısı ve validation
      const result = await OpenAIQueryParser.parseQueryIntent(trimmed, prisma);
      return result;
    } catch (err: any) {
      // ADIM 5: Silent Fallback — Her türlü hatada sessizce eski akışa dön
      console.error(
        `[ParseQueryIntentUseCase] Silent Fallback Triggered: ${err.message || String(err)}`
      );
      return { hardRequirements: [], softContext: trimmed };
    }
  }
}
