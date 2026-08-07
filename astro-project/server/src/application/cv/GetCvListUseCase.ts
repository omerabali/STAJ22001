/**
 * GetCvListUseCase.ts (CV Listeleme Kullanım Senaryosu)
 * Görevi: Giriş yapmış kullanıcının kendi CV'lerini (veya ADMIN ise tüm platform CV'lerini)
 * son analiz durumları ve oluşturulma tarihlerine göre sıralı şekilde getirir.
 */
import { PrismaClient } from "@prisma/client";

export class GetCvListUseCase {
  public static async execute(userId: string, userRole: string, prisma: PrismaClient) {
    // Admin ise platformdaki TÜM CV'leri getir, normal kullanıcı ise sadece kendi CV'lerini getir
    const whereCondition = userRole === "ADMIN" ? {} : { userId };

    const cvs = await prisma.cV.findMany({
      where: whereCondition,
      orderBy: { createdAt: "desc" },//en son yüklenen en önce listele mantığı
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
          take: 1,//cv ye yapılmış en son aı analiz sonucunu cv nin yanına ekler
        },
      },
    });

    return cvs;
  }
}
