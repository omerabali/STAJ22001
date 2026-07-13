import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { searchSimilarCVs } from "../utils/embeddings.js";

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
    const results = await searchSimilarCVs(query, searchLimit, prisma);
    const duration = Date.now() - startTime;

    console.log(`[SearchRoute] Semantic search for "${query}" completed in ${duration}ms. Results count: ${results.length}`);

    res.json({
      results,
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

export default router;

