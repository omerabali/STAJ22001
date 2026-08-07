/**
 * GetCvChunksUseCase.ts (CV Metin Parçalarını Getirme Kullanım Senaryosu)
 * Görevi: Seçilen CV'ye ait mantıksal metin parçalarını (Eğitim, Deneyim vb. sıralı chunks)
 * yetki kontrolü (sahibi veya ADMIN) yaparak getirir.
 */
export class GetCvChunksUseCase {
  public static async execute(id: string, requestingUser: { id: string; role: string }, prisma: any) {
    const cv = await prisma.cV.findFirst({
      where: requestingUser.role === "ADMIN"
        ? { id }
        : { id, userId: requestingUser.id },
      include: {
        chunks: { orderBy: { chunkIndex: "asc" } }
      }
    });

    if (!cv) {
      const error: any = new Error("CV bulunamadı veya yetkiniz yok.");
      error.statusCode = 404;
      throw error;
    }

    return { chunks: cv.chunks, fileName: cv.fileName };
  }
}
