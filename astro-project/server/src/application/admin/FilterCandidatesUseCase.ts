/**
 * FilterCandidatesUseCase.ts (Aday Filtreleme & Arama Kullanım Senaryosu)
 * Görevi: İK Admin paneli aday havuzunda isim, e-posta, min/maks ATS skoru, yetenekler
 * ve tarih aralıklarına göre gelişmiş filtreleme ve sayfalama (pagination) yapar.
 */
import { PrismaClient, Prisma } from "@prisma/client";

export interface CandidateFilterDTO {
  query?: string;
  minAts?: number;
  maxAts?: number;
  status?: string;
  role?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class FilterCandidatesUseCase {
  public static async execute(dto: CandidateFilterDTO, prisma: PrismaClient) {
    const { query, minAts, maxAts, status, dateFrom, dateTo } = dto;

    const where: Prisma.UserWhereInput = {
      role: "CANDIDATE",
    };

    const cvWhere: Prisma.CVWhereInput = {};
    const analysisWhere: Prisma.CVAnalysisWhereInput = {};

    if (minAts !== undefined || maxAts !== undefined) {
      analysisWhere.atsScore = {};
      if (minAts !== undefined) analysisWhere.atsScore.gte = minAts;
      if (maxAts !== undefined) analysisWhere.atsScore.lte = maxAts;
    }

    if (status && status !== "ALL") {
      analysisWhere.status = status as any;
    }

    if (dateFrom || dateTo) {
      cvWhere.createdAt = {};
      if (dateFrom) cvWhere.createdAt.gte = new Date(dateFrom);
      if (dateTo) cvWhere.createdAt.lte = new Date(dateTo);
    }

    if (Object.keys(analysisWhere).length > 0) {
      cvWhere.analyses = { some: analysisWhere };
    }

    if (Object.keys(cvWhere).length > 0) {
      where.cvs = { some: cvWhere };
    }

    if (query && query.trim() !== "") {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        {
          cvs: {
            some: {
              OR: [
                { fileName: { contains: q, mode: "insensitive" } },
                { rawText: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    const candidates = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        cvs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            analyses: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return candidates;
  }
}
