import { PrismaClient, Role } from "@prisma/client";

export class DeleteCandidateUseCase {
  public static async execute(targetUserId: string, requestingAdminId: string, prisma: PrismaClient) {
    if (targetUserId === requestingAdminId) {
      const err = new Error("Kendi admin hesabınızı silemezsiniz.");
      (err as any).statusCode = 400;
      throw err;
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
    });

    if (!user) {
      const err = new Error("Kullanıcı bulunamadı.");
      (err as any).statusCode = 404;
      throw err;
    }

    // GÜVENLİK KURALI: Başka bir admin hesabı silinemez!
    if (user.role === Role.ADMIN) {
      const err = new Error("Yönetici hesapları silinemez.");
      (err as any).statusCode = 403;
      throw err;
    }

    await prisma.user.delete({ where: { id: targetUserId } });
    return { success: true, message: "Aday hesabı başarıyla silindi." };
  }
}
