import { z } from "zod";

export const HardRequirementSchema = z.object({
  kriter: z.string().min(1),
  zorunluluk: z.enum(["kesin", "tercih_edilir"])
});

export const ParsedQuerySchema = z.object({
  hard_requirements: z.array(HardRequirementSchema),
  soft_context: z.string()
});

export type ParsedQueryDTO = z.infer<typeof ParsedQuerySchema>;
