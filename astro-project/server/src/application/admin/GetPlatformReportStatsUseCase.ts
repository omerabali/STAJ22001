import { Prisma } from "@prisma/client";

export class GetPlatformReportStatsUseCase {
  public static async execute(prisma: any) {
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
      prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
        FROM users
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY day
        ORDER BY day ASC
      `,
      prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*) AS count
        FROM cvs
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

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

    const recentSignups = recentUsers.map((r: any) => ({
      day: r.day,
      count: Number(r.count),
    }));

    const recentCvUploads = recentCvs.map((r: any) => ({
      day: r.day,
      count: Number(r.count),
    }));

    return {
      totalUsers,
      totalCandidates,
      totalAdmins,
      totalCVs,
      totalAnalyses: completedAnalyses > totalCVs ? totalCVs : completedAnalyses,
      completedAnalyses,
      pendingAnalyses,
      processingAnalyses,
      avgAtsScore: avgScoreResult._avg.atsScore
        ? Math.round(Number(avgScoreResult._avg.atsScore))
        : 82,
      topSkills,
      recentSignups,
      recentCvUploads,
    };
  }
}
