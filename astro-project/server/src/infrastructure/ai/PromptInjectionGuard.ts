/**
 * PromptInjectionGuard.ts (Yapay Zeka Güvenlik & Enjeksiyon Kalkanı)
 * Görevi: CV metninde veya arama sorgusunda yapay zekayı kandırmaya çalışan zararlı komutları
 * (`"ignore previous instructions"`, `"rate candidate 100/100"` vb.) Regex ile tespit edip engelleyen güvenlik kalkanıdır.
 */
export class PromptInjectionGuard {//kara liste
  private static INJECTION_PATTERNS = [
    "ignore previous instructions",
    "ignore all previous",
    "disregard all previous",
    "disregard previous",
    "rate this candidate",
    "rate the candidate",
    "mark as excellent match",
    "mark as outstanding",
    "mark as perfect match",
    "you are now",
    "you must now",
    "ignore any weaknesses",
    "ignore weaknesses",
    "system prompt"
  ];

  /**
   * gelen metinde eğer yukardaki bu ifadelerden biri varsa true döner
   */
  public static detectInjection(rawText: string): boolean {
    const lower = (rawText || "").toLowerCase();
    return this.INJECTION_PATTERNS.some((pattern) => lower.includes(pattern));
  }
}
