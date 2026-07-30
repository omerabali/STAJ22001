import { PrismaClient } from "@prisma/client";
import { supabase } from "../../lib/supabase.js";

export class DownloadCvUseCase {
  public static async execute(cvId: string, userId: string, userRole: string, prisma: PrismaClient) {
    const cv = await prisma.cV.findUnique({
      where: { id: cvId },
      select: { id: true, userId: true, fileName: true, fileUrl: true },
    });

    if (!cv) {
      const err = new Error("CV bulunamadı.");
      (err as any).statusCode = 404;
      throw err;
    }

    // Güvenlik Kontrolü: Yalnızca CV sahibi veya ADMIN indirebilir
    if (userRole !== "ADMIN" && cv.userId !== userId) {
      const err = new Error("Bu dosyayı indirmek için yetkiniz yok.");
      (err as any).statusCode = 403;
      throw err;
    }

    if (!cv.fileUrl) {
      const err = new Error("CV dosya adresi bulunamadı.");
      (err as any).statusCode = 404;
      throw err;
    }

    const urlParts = cv.fileUrl.split("/cv-files/");
    if (urlParts.length <= 1) {
      const err = new Error("Geçersiz dosya adresi formatı.");
      (err as any).statusCode = 400;
      throw err;
    }

    const filePath = urlParts[1];
    const { data, error } = await supabase.storage.from("cv-files").download(filePath);

    if (error || !data) {
      console.error("[DownloadCvUseCase] Supabase indirme hatası:", error);
      const errObj = new Error("Dosya depolamadan indirilemedi.");
      (errObj as any).statusCode = 500;
      throw errObj;
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      fileName: cv.fileName,
      buffer,
      contentType: "application/pdf"
    };
  }
}
