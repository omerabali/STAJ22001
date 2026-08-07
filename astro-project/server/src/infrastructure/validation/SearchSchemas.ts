/**
 * SearchSchemas.ts (Zod Arama Yanıtı Şema Doğrulayıcısı)
 * Görevi: OpenAI GPT modellerinden dönen JSON yanıtlarının tip güvenliğini Zod kütüphanesi ile denetler.
 * Şemaya uymayan bozuk GPT yanıtlarını anında tespit ederek güvenli fallback mekanizmasına iletir.
 */
import { z } from "zod";

export const HardRequirementSchema = z.object({
  kriter: z.string().min(1),//kriterde en az 1'i olacak 
  zorunluluk: z.enum(["kesin", "tercih_edilir"])//zorunluluk da ise bu ikisinde biri olur bunlar dışında bir şey gelirse hata verir  
});

export const ParsedQuerySchema = z.object({
  hard_requirements: z.array(HardRequirementSchema),
  soft_context: z.string()
});

export type ParsedQueryDTO = z.infer<typeof ParsedQuerySchema>;
//aslında burdaki mantık ai zaten çevirmeyi yapıyor ve json üretiyor ya zod burada db ye ve koda almadan önce kontrol ediyor
//doğru formatta mı döndürdüm diye 