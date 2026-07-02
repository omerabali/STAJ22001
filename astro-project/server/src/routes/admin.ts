import { Router, Request, Response } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { supabase } from "../lib/supabase.js";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const router = Router();

// Get dashboard stats
router.get("/stats", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCandidates, totalAdmins, newUsersToday] = await Promise.all([
      prisma.user.count({ where: { role: 'CANDIDATE' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { createdAt: { gte: today } } })
    ]);

    res.json({
      candidates: totalCandidates,
      admins: totalAdmins,
      newUsersToday
    });
  } catch (error) {
    console.error("Stats alınırken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// Get all users
router.get("/users", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json({ users });
  } catch (error) {
    console.error("Kullanıcıları listelerken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// Change user role
router.put("/users/:id/role", authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!role || (role !== "ADMIN" && role !== "CANDIDATE")) {
      res.status(400).json({ message: "Geçersiz rol belirtildi." });
      return;
    }

    // Don't allow changing your own role to avoid locking yourself out by accident
    if (req.user?.id === id) {
      res.status(400).json({ message: "Kendi rolünüzü değiştiremezsiniz." });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    res.json({ user: updatedUser, message: "Rol başarıyla güncellendi." });
  } catch (error) {
    console.error("Kullanıcı rolü güncellenirken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// Get all candidates with CV & analysis info
router.get("/candidates", authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || "";
    const filter = (req.query.filter as string) || "all"; // all | completed | processing | pending

    const users = await prisma.user.findMany({
      where: {
        role: "CANDIDATE",
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        cvs: {
          select: {
            id: true,
            fileName: true,
            createdAt: true,
            analyses: {
              select: {
                id: true,
                status: true,
                atsScore: true,
                skills: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Flatten and enrich
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
        latestCvName: latestCv?.fileName || null,
        analysisStatus: latestAnalysis?.status || null,
        atsScore: latestAnalysis?.atsScore || null,
        skills: latestAnalysis?.skills || [],
      };
    });

    // Apply filter
    const filtered =
      filter === "all"
        ? candidates
        : candidates.filter((c) => {
            if (filter === "completed") return c.analysisStatus === "COMPLETED";
            if (filter === "processing") return c.analysisStatus === "PROCESSING";
            if (filter === "pending") return c.analysisStatus === "PENDING" || !c.analysisStatus;
            return true;
          });

    res.json({ candidates: filtered, total: filtered.length });
  } catch (error) {
    console.error("Adaylar listelenirken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// Get platform report statistics
router.get("/reports/stats", authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalCandidates,
      totalAdmins,
      totalCVs,
      totalAnalyses,
      completedAnalyses,
      pendingAnalyses,
      processingAnalyses,
      avgScoreResult,
      recentUsers,
      recentCvs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "CANDIDATE" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.cV.count(),
      prisma.cVAnalysis.count(),
      prisma.cVAnalysis.count({ where: { status: "COMPLETED" } }),
      prisma.cVAnalysis.count({ where: { status: "PENDING" } }),
      prisma.cVAnalysis.count({ where: { status: "PROCESSING" } }),
      prisma.cVAnalysis.aggregate({
        _avg: { atsScore: true },
        where: { status: "COMPLETED", atsScore: { not: null } },
      }),
      // Last 7 days new user signups (grouped by day)
      prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
        FROM users
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY day
        ORDER BY day ASC
      `,
      // Last 7 days CV uploads (grouped by day)
      prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
        FROM cvs
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

    // Top skills from all completed analyses
    const completedWithSkills = await prisma.cVAnalysis.findMany({
      where: { status: "COMPLETED", skills: { not: Prisma.DbNull } },
      select: { skills: true },
      take: 200,
    });

    const skillCount: Record<string, number> = {};
    for (const a of completedWithSkills) {
      const skills = a.skills as string[] | null;
      if (Array.isArray(skills)) {
        for (const s of skills) {
          const key = String(s).trim();
          if (key) skillCount[key] = (skillCount[key] || 0) + 1;
        }
      }
    }

    const topSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    const recentSignups = recentUsers.map((r) => ({
      day: r.day,
      count: Number(r.count),
    }));

    const recentCvUploads = recentCvs.map((r) => ({
      day: r.day,
      count: Number(r.count),
    }));

    res.json({
      totalUsers,
      totalCandidates,
      totalAdmins,
      totalCVs,
      totalAnalyses,
      completedAnalyses,
      pendingAnalyses,
      processingAnalyses,
      avgAtsScore: avgScoreResult._avg.atsScore
        ? Math.round(Number(avgScoreResult._avg.atsScore))
        : null,
      topSkills,
      recentSignups,
      recentCvUploads,
    });
  } catch (error) {
    console.error("Rapor istatistikleri alınırken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

// GET /api/admin/candidates/:id
router.get("/candidates/:id", authMiddleware, adminMiddleware, async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  try {
    const candidate = await prisma.user.findFirst({
      where: { id: id, role: "CANDIDATE" },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
        cvs: {
          include: {
            analyses: {
              orderBy: { createdAt: "desc" }
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!candidate) {
      res.status(404).json({ message: "Aday bulunamadı." });
      return;
    }

    // Generate signed URLs for CVs
    const cvsWithSignedUrls = await Promise.all(
      candidate.cvs.map(async (cv) => {
        const urlParts = cv.fileUrl.split('/cv-files/');
        const filePath = urlParts[1];

        if (!filePath) return cv;

        const { data, error } = await supabase.storage
          .from("cv-files")
          .createSignedUrl(filePath, 3600); // 1 hour expiration

        if (error) {
          console.error(`Error generating signed URL for CV ${cv.id}:`, error);
        }

        return {
          ...cv,
          fileUrl: data?.signedUrl || cv.fileUrl
        };
      })
    );

    res.json({
      candidate: {
        ...candidate,
        cvs: cvsWithSignedUrls
      }
    });
  } catch (error) {
    console.error("Aday detayları alınırken hata:", error);
    res.status(500).json({ message: "Sunucu hatası." });
  }
});

export default router;

