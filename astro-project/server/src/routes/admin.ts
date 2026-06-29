import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";

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
    const { id } = req.params;
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

export default router;
