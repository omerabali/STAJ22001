import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { GetDashboardStatsUseCase } from "../application/admin/GetDashboardStatsUseCase.js";
import { ChangeUserRoleUseCase } from "../application/admin/ChangeUserRoleUseCase.js";
import { GetCandidateProfileUseCase } from "../application/admin/GetCandidateProfileUseCase.js";
import { FilterCandidatesUseCase } from "../application/admin/FilterCandidatesUseCase.js";
import { DeleteCandidateUseCase } from "../application/admin/DeleteCandidateUseCase.js";
import { GetAdminUsersUseCase } from "../application/admin/GetAdminUsersUseCase.js";
import { GetPlatformReportStatsUseCase } from "../application/admin/GetPlatformReportStatsUseCase.js";
import { GetCostReportUseCase } from "../application/admin/GetCostReportUseCase.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = Router();

// GET /api/admin/stats
router.get("/stats", authMiddleware, adminMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await GetDashboardStatsUseCase.execute(prisma);
    res.json(stats);
  } catch (error) {
    console.error("Stats alınırken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// GET /api/admin/users
router.get("/users", authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const currentAdminId = req.user?.id || "";
    const result = await GetAdminUsersUseCase.execute(currentAdminId, prisma);
    res.json(result);
  } catch (error) {
    console.error("Kullanıcıları listelerken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// PUT /api/admin/users/:id/role
router.put("/users/:id/role", authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id as string;
    const { role } = req.body;

    const updatedUser = await ChangeUserRoleUseCase.execute({
      targetUserId,
      newRole: role,
      requestingAdminId: req.user?.id
    }, prisma);

    res.json({
      message: "Kullanıcı rolü güncellendi.",
      user: updatedUser
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ message: error.message || "Rol güncellenirken hata oluştu." });
  }
});

// GET /api/admin/candidates
router.get("/candidates", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || (req.query.query as string) || "";
    const filter = (req.query.filter as string) || (req.query.status as string) || "all";

    const users = await FilterCandidatesUseCase.execute({
      query: search,
      status: filter.toUpperCase(),
    }, prisma);

    const candidates = users.map((u) => {
      const latestCv = u.cvs[0] || null;
      const latestAnalysis = latestCv?.analyses[0] || null;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        cvCount: u.cvs.length,
        latestCvId: latestCv?.id || null,
        latestCvName: latestCv?.fileName || null,
        analysisStatus: latestAnalysis?.status || null,
        atsScore: latestAnalysis?.atsScore || null,
        skills: latestAnalysis?.skills || [],
      };
    });

    const filtered = filter === "all" || filter === "ALL"
      ? candidates
      : candidates.filter((c) => {
          const fLower = filter.toLowerCase();
          if (fLower === "completed") return c.analysisStatus === "COMPLETED";
          if (fLower === "processing") return c.analysisStatus === "PROCESSING";
          if (fLower === "pending") return c.analysisStatus === "PENDING" || !c.analysisStatus;
          return true;
        });

    res.json({ candidates: filtered, total: filtered.length });
  } catch (error) {
    console.error("Adaylar listelenirken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// GET /api/admin/reports/stats
router.get("/reports/stats", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const stats = await GetPlatformReportStatsUseCase.execute(prisma);
    res.json(stats);
  } catch (error) {
    console.error("Rapor istatistikleri alınırken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// GET /api/admin/candidates/:id
router.get("/candidates/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  let targetUserId = req.params.id as string;
  if (targetUserId) {
    try { targetUserId = decodeURIComponent(targetUserId).trim(); } catch {}
    targetUserId = targetUserId.replace(/\s+/g, '-');
  }

  try {
    const candidate = await GetCandidateProfileUseCase.execute(targetUserId, prisma);
    res.json({ candidate });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || "Aday profili alınamadı." });
  }
});

// DELETE /api/admin/candidates/:id
router.delete("/candidates/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  const targetUserId = req.params.id as string;
  const requestingAdminId = req.user?.id || "";

  try {
    const result = await DeleteCandidateUseCase.execute(targetUserId, requestingAdminId, prisma);
    res.json(result);
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || "Aday silinemedi." });
  }
});

// GET /api/admin/cost-report
router.get("/cost-report", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const report = await GetCostReportUseCase.execute(prisma);
    res.json(report);
  } catch (error) {
    console.error("Cost raporu alınırken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

export default router;
