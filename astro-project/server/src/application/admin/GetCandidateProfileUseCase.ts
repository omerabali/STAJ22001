import { PrismaClient } from "@prisma/client";

/**
 * GetCandidateProfileUseCase.ts (Aday Profil Detayı Getirme Kullanım Senaryosu)
 * Görevi: Admin paneli üzerinden hedeflenen tek bir adayın iletişim bilgilerini, yüklediği CV'leri
 * ve yapay zeka tarafından çıkarılan SWOT analiz detaylarını getirir.
 */
export class GetCandidateProfileUseCase {
  public static async execute(targetUserId: string, prisma: PrismaClient) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        cvs: {
          orderBy: { createdAt: "desc" },
          include: {
            analyses: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user) {
      const err = new Error("Kullanıcı bulunamadı.");
      (err as any).statusCode = 404;
      throw err;
    }

    return user;
  }
}
