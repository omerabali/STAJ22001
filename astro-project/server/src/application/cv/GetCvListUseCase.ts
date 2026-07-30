import { PrismaClient } from "@prisma/client";

export class GetCvListUseCase {
  public static async execute(userId: string, userRole: string, prisma: PrismaClient) {
    // Admin ise platformdaki TÜM CV'leri getir, normal kullanıcı ise sadece kendi CV'lerini getir
    const whereCondition = userRole === "ADMIN" ? {} : { userId };

    const cvs = await prisma.cV.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return cvs;
  }
}
