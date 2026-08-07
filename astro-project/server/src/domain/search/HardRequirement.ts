/**
 * HardRequirement.ts (Arama Sert Kriter Domain Tanımları)
 * Görevi: Doğal dille yapılan aramalarda kullanıcının vazgeçilmez isteklerini (sertifikalar, diller, min tecrübe)
 * ve yumuşak arama bağlamını (softContext) temsil eden temel TypeScript arayüz yapılarıdır.
 */
export type RequirementZorunluluk = "kesin" | "tercih_edilir";

export interface HardRequirement {
  kriter: string;
  zorunluluk: RequirementZorunluluk;
}

export interface ParsedQuery {
  hardRequirements: HardRequirement[];
  softContext: string;
}
