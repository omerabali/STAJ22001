import { PrismaClient } from "@prisma/client";
import { ParseQueryIntentUseCase } from "./ParseQueryIntentUseCase.js";
import { searchSimilarCVs } from "../../utils/embeddings.js";
import { RankingService, RankedResult } from "../../services/RankingService.js";
import { ParsedQuery } from "../../domain/search/HardRequirement.js";

export class VerifyHardRequirementsUseCase {
  /**
   * Executes the full semantic search pipeline:
   * 1. Parse Query Intent for hard/soft requirements (with silent fallback)
   * 2. Perform vector search using softContext (or original query)
   * 3. Apply hybrid ranking with prompt extension for hard requirements
   */
  public static async execute(
    queryText: string,
    searchLimit: number,
    prisma: PrismaClient
  ): Promise<{ results: RankedResult[]; parsedQuery: ParsedQuery }> {
    // 1. Parse Query Intent (Adım 1, 2, 3 & 5 - Silent Fallback)
    const parsedQuery = await ParseQueryIntentUseCase.execute(queryText, prisma);

    // 2. Vector Search (Vektör aramasında softContext veya orijinal sorguyu kullanıyoruz)
    const searchQuery = parsedQuery.softContext || queryText;
    const vectorMatches = await searchSimilarCVs(searchQuery, searchLimit, prisma);

    // 3. Score & Rank candidates with Hard Requirements Prompt Extension (Adım 4)
    const rankedResults = await RankingService.scoreAndRankCVs(
      queryText,
      vectorMatches,
      prisma,
      parsedQuery.hardRequirements
    );

    return {
      results: rankedResults,
      parsedQuery
    };
  }
}
