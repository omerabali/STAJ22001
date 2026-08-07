/**
 * GetAdminUsersUseCase.ts (Admin Kullanıcıları Listeleme Kullanım Senaryosu)
 * Görevi: Sistemde yetkili olan tüm İK Yöneticisi (ADMIN) hesaplarını listeler.
 */
import { PrismaClient } from "@prisma/client";

export class GetAdminUsersUseCase {
  public static async execute(currentAdminId: string, prisma: any) {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { role: "CANDIDATE" },
          { id: currentAdminId }
        ]
      },
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

    return { users };
  }
}
