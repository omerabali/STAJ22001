/**
 * GetCostReportUseCase.ts (OpenAI Maliyet & Jeton Raporu Kullanım Senaryosu)
 * Görevi: OpenAI API harcamalarını, harcanan token (giriş/çıkış) miktarlarını ve
 * USD cinsinden toplam maliyet analizini modeller bazında hesaplayıp raporlar.
 */
import { PrismaClient } from "@prisma/client";

export class GetCostReportUseCase {
  public static async execute(prisma: any) {
    const report = await prisma.$queryRaw<any[]>`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN "costUsd" ELSE 0 END), 0)::float as "totalCostUsd",
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN "tokensIn" ELSE 0 END), 0)::int as "totalTokensIn",
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN "tokensOut" ELSE 0 END), 0)::int as "totalTokensOut",
        COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN "tokensIn" + "tokensOut" ELSE 0 END), 0)::int as "totalTokens",
        COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END)::int as "successCalls",
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::int as "failedCalls",
        COUNT(*)::int as "totalCalls"
      FROM api_calls
    `;

    const modelStats = await prisma.$queryRaw<any[]>`
      SELECT 
        model,
        endpoint,
        COUNT(*)::int as "calls",
        COALESCE(SUM("tokensIn"), 0)::int as "tokensIn",
        COALESCE(SUM("tokensOut"), 0)::int as "tokensOut",
        COALESCE(SUM("costUsd"), 0)::float as "costUsd"
      FROM api_calls
      WHERE status = 'SUCCESS'
      GROUP BY model, endpoint
      ORDER BY "costUsd" DESC
    `;

    return {
      summary: report[0] || {
        totalCostUsd: 0,
        totalTokensIn: 0,
        totalTokensOut: 0,
        totalTokens: 0,
        successCalls: 0,
        failedCalls: 0,
        totalCalls: 0
      },
      modelStats
    };
  }
}
