import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { searchSimilarCVs } from "../utils/embeddings.js";
import { RankingService } from "../services/RankingService.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = Router();

/**
 * POST /api/search
 * Semantik CV Arama endpoint'i.
 * Sadece yöneticiler (ADMIN) tarafından erişilebilir.
 *
 * Request Body:
 * {
 *   "query": "React developer with 3 years experience",
 *   "limit": 30 (optional, default: 30)
 * }
 */
router.post("/", authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { query, limit } = req.body;

  // 1. Request Body Validation
  if (!query || typeof query !== "string" || query.trim() === "") {
    res.status(400).json({ message: "Arama sorgusu (query) zorunludur ve boş olamaz." });
    return;
  }

  const searchLimit = typeof limit === "number" && limit > 0 ? limit : 30;

  try {
    // 2. Perform Semantic Search (Global admin search)
    const vectorMatches = await searchSimilarCVs(query, searchLimit, prisma);

    // 3. Rank and score matches using GPT-4o-mini suitability analysis
    const rankedResults = await RankingService.scoreAndRankCVs(query, vectorMatches, prisma);

    // 4. Log the search query in SearchLog table
    if (req.user) {
      await prisma.searchLog.create({
        data: {
          userId: req.user.id,
          query: query.trim()
        }
      }).catch(err => console.error("[SearchRoute] Failed to save search log:", err));
    }

    const duration = Date.now() - startTime;

    console.log(`[SearchRoute] Semantic search and ranking for "${query}" completed in ${duration}ms. Results count: ${rankedResults.length}`);

    res.json({
      results: rankedResults,
      processingTimeMs: duration
    });
  } catch (error: any) {
    console.error("[SearchRoute] Error during semantic search:", error);
    res.status(500).json({
      message: "Arama işlemi gerçekleştirilirken bir sunucu hatası oluştu.",
      error: error.message || String(error),
    });
  }
});

/**
 * GET /api/search/logs
 * Son yapılan 10 semantik arama geçmişini döndürür.
 * Sadece yöneticiler (ADMIN) erişebilir.
 */
router.get("/logs", authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.searchLog.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 10
    });
    res.json(logs);
  } catch (error: any) {
    console.error("[SearchRoute] Error getting search logs:", error);
    res.status(500).json({
      message: "Arama geçmişi alınırken bir sunucu hatası oluştu.",
      error: error.message || String(error)
    });
  }
});

/**
 * DELETE /api/search/logs/:id
 * Belirtilen arama geçmişi kaydını siler.
 * Sadece yöneticiler (ADMIN) erişebilir.
 */
router.delete("/logs/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  try {
    const deleted = await prisma.searchLog.deleteMany({
      where: { id: id, userId: req.user!.id }
    });
    if (deleted.count === 0) {
      res.status(404).json({ message: "Arama kaydı bulunamadı." });
      return;
    }
    res.json({ message: "Arama kaydı silindi." });
  } catch (error: any) {
    console.error("[SearchRoute] Error deleting search log:", error);
    res.status(500).json({
      message: "Arama kaydı silinirken sunucu hatası oluştu.",
      error: error.message || String(error)
    });
  }
});

export default router;

