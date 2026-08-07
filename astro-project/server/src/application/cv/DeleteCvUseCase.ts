/**
 * DeleteCvUseCase.ts (CV Silme Kullanım Senaryosu)
 * Görevi: Seçilen CV kaydını veritabanından, ona bağlı tüm metin parçalarını (chunks/embeddings),
 * analiz sonuçlarını ve Supabase Storage'daki fiziksel PDF dosyasını kalıcı olarak siler.
 */
import { PrismaClient } from "@prisma/client";
import { supabase } from "../../lib/supabase.js";

export class DeleteCvUseCase {
  public static async execute(cvId: string, userId: string, prisma: PrismaClient) {
    const cv = await prisma.cV.findUnique({
      where: { id: cvId },
      select: { id: true, userId: true, fileUrl: true },
    });

    if (!cv) {
      const err = new Error("CV bulunamadı.");
      (err as any).statusCode = 404;
      throw err;
    }

    if (cv.userId !== userId) {
      const err = new Error("Bu işlem için yetkiniz yok.");
      (err as any).statusCode = 403;
      throw err;
    }

    // Supabase Storage'dan dosyayı sil (varsa)
    if (cv.fileUrl) {
      try {
        const urlParts = cv.fileUrl.split("/cv-files/");
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from("cv-files").remove([filePath]);
        }
      } catch (storageErr) {
        console.error("[DeleteCvUseCase] Supabase dosya silme hatası:", storageErr);
      }
    }

    // Prisma cascades automatically delete analyses & chunks
    await prisma.cV.delete({ where: { id: cvId } });
    return { success: true, message: "CV başarıyla silindi." };
  }
}
