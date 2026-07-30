export class PromptInjectionGuard {
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
   * Scans raw text for potential prompt injection patterns
   */
  public static detectInjection(rawText: string): boolean {
    const lower = (rawText || "").toLowerCase();
    return this.INJECTION_PATTERNS.some((pattern) => lower.includes(pattern));
  }
}
