export type RequirementZorunluluk = "kesin" | "tercih_edilir";

export interface HardRequirement {
  kriter: string;
  zorunluluk: RequirementZorunluluk;
}

export interface ParsedQuery {
  hardRequirements: HardRequirement[];
  softContext: string;
}
