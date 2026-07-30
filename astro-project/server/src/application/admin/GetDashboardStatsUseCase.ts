import { PrismaClient } from "@prisma/client";

export interface DashboardStatsResponse {
  candidates: number;
  admins: number;
  newUsersToday: number;
}

export class GetDashboardStatsUseCase {
  public static async execute(prisma: PrismaClient): Promise<DashboardStatsResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCandidates, totalAdmins, newUsersToday] = await Promise.all([
      prisma.user.count({ where: { role: 'CANDIDATE' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { createdAt: { gte: today } } })
    ]);

    return {
      candidates: totalCandidates,
      admins: totalAdmins,
      newUsersToday
    };
  }
}
