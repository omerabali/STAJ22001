/**
 * StructuredRequirementEvaluator.ts (Adım 5: Code-Based Hard Requirement Evaluator)
 * Görevi: StructuredData mevcutsa ve needsReview === false ise hard requirement'ları
 * sıfır LLM maliyetiyle ve saf Kod (CEFR Score >= vb.) ile denetler.
 * structuredData yoksa veya needsReview === true ise null döndürerek sessizce eski LLM akışına düşer (Fallback).
 */
import { CvStructuredData, getCefrScore } from "../../domain/cv/CvStructuredData.js";

export class StructuredRequirementEvaluator {
  public static evaluateHardRequirement(
    kriter: string,
    structuredData?: CvStructuredData | null,
    needsReview?: boolean
  ): { met: boolean; reason: string; usedStructuredCode: boolean } | null {
    // 5. ADIM FALLBACK KURALI: structuredData yoksa veya needsReview=true ise sessizce eski akışa düş (null dön)
    if (!structuredData || needsReview === true) {
      return null;
    }

    const lowerKriter = (kriter || "").toLowerCase().trim();

    // A) DİL & CEFR DİZİSİ DENETİMİ (A1=1, A2=2, B1=3, B2=4, C1=5, C2=6, Native=7)
    // Örn kriter: "A1 Almanca", "Almanca A1", "İngilizce B2", "Almanca"
    const isLanguageCheck = lowerKriter.includes("almanca") || lowerKriter.includes("ingilizce") ||
                            lowerKriter.includes("german") || lowerKriter.includes("english") ||
                            lowerKriter.includes("fransızca") || lowerKriter.includes("ispanyolca");

    if (isLanguageCheck) {
      let targetLang = "Almanca";
      if (lowerKriter.includes("ingilizce") || lowerKriter.includes("english")) targetLang = "İngilizce";
      if (lowerKriter.includes("fransızca") || lowerKriter.includes("french")) targetLang = "Fransızca";
      if (lowerKriter.includes("ispanyolca") || lowerKriter.includes("spanish")) targetLang = "İspanyolca";

      // İstenen CEFR seviyesini tespit et (varsayılan A1)
      let requiredCefrScore = 1;
      if (lowerKriter.includes("a2")) requiredCefrScore = 2;
      else if (lowerKriter.includes("b1")) requiredCefrScore = 3;
      else if (lowerKriter.includes("b2")) requiredCefrScore = 4;
      else if (lowerKriter.includes("c1")) requiredCefrScore = 5;
      else if (lowerKriter.includes("c2")) requiredCefrScore = 6;
      else if (lowerKriter.includes("native") || lowerKriter.includes("anadil")) requiredCefrScore = 7;

      const candLang = (structuredData.languages || []).find(l =>
        l.language.toLowerCase().includes(targetLang.toLowerCase()) ||
        targetLang.toLowerCase().includes(l.language.toLowerCase())
      );

      if (!candLang) {
        return {
          met: false,
          reason: `StructuredData Denetimi: CV'de ${targetLang} bilgisi bulunmamaktadır.`,
          usedStructuredCode: true
        };
      }

      const candScore = getCefrScore(candLang.cefr || candLang.raw);

      if (candScore >= requiredCefrScore) {
        return {
          met: true,
          reason: `StructuredData Denetimi: CV'de ${targetLang} (${candLang.cefr || candLang.raw}) bilgisi mevcut olup istenen ${kriter} şartını (>=) karşılamaktadır.`,
          usedStructuredCode: true
        };
      } else {
        return {
          met: false,
          reason: `StructuredData Denetimi: CV'deki ${targetLang} seviyesi (${candLang.cefr}) istenen ${kriter} seviyesinin altındadır.`,
          usedStructuredCode: true
        };
      }
    }

    // B) SERTİFİKA, SKILL, ÖDÜL, LOKASYON KOD KONTROLÜ
    const allTokens = [
      ...(structuredData.skills || []),
      ...(structuredData.certifications || []),
      ...(structuredData.awards || []),
      ...(structuredData.titles || []),
      ...(structuredData.locations || [])
    ].map(s => s.toLowerCase());

    const matched = allTokens.some(token => token.includes(lowerKriter) || lowerKriter.includes(token));
    if (matched) {
      return {
        met: true,
        reason: `StructuredData Denetimi: "${kriter}" yeteneği/niteliği adayın yapılandırılmış profilinde doğrulandı.`,
        usedStructuredCode: true
      };
    }

    // Eğer tam eşleşme bulunamadıysa riske atmamak için sessizce LLM denetimine devret (null)
    return null;
  }
}
