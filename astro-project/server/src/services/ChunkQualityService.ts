/**
 * ChunkQualityService.ts (3-Katmanlı CV Parçalama & Metin İyileştirme Servisi)
 * Görevi: PDF'ten çıkarılan ham metnin parçalama kalitesini 3 aşamalı güvenilirlik boru hattından (Pipeline) geçirir.
 * 
 * 💡 Neden Çok Kritik?:
 * Bozuk düzenli PDF'lerin (örneğin iki sütunlu Canva CV'leri) yanlış parçalanmasını önler:
 * - Layer 1 (Kaba Bölümleme): Kural tabanlı başlık eşleştirme ve güven skoru hesabı yaparlar.
 * - Layer 2 (AI Düzeltme): Karışmış veya belirsiz bölümleri GPT modelleriyle doğru kategoriye (Eğitim, Deneyim vb.) tamir eder.
 * - Layer 3 (Kalite İzleme & Trace Log): Yapılan tüm düzeltmeleri ve değişim geçmişini izlenebilir log formatına dönüştürür.
 */
export interface Layer1Chunk {

  sectionKey: string;
  originalTitle: string;
  text: string;
  confidence: number;
  reasoning: string;
}

export interface Layer2Chunk {
  originalTitle: string;
  type: string;
  text: string;
  duzeltildi: boolean;
  duzeltme_aciklamasi?: string;
  confidence_score: number;
}

export interface Layer3Chunk {
  originalTitle: string;
  type: string;
  text: string;
  confidence_score: number;
  aciklama?: string;
}

export interface QualityTraceLog {
  layer1: {
    type: string;
    originalTitle: string;
    confidence: number;
    reasoning: string;
  };
  layer2?: {
    type: string;
    originalTitle: string;
    confidence_score: number;
    duzeltildi: boolean;
    duzeltme_aciklamasi?: string;
  };
  layer3?: {
    type: string;
    originalTitle: string;
    confidence_score: number;
    aciklama?: string;
  };
  finalSource: "layer2" | "layer3" | "rule_based_final";
  finalScore: number;
}

/**
 * KATMAN 2 — Kontrol + Düzeltme + Skorlama (Tek Çağrı)
 * gpt-4o-mini, response_format: json_object, temperature: 0
 */
export async function inspectAndCorrectChunks(
  chunks: Layer1Chunk[],
  rawText: string,
  lang: "tr" | "en",
  prisma?: any
): Promise<Layer2Chunk[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[ChunkQualityService] No OPENAI_API_KEY — skipping Layer 2 quality inspection.");
    return chunks.map(c => ({
      originalTitle: c.originalTitle,
      type: c.sectionKey,
      text: c.text,
      duzeltildi: false,
      confidence_score: Math.round((c.confidence ?? 0.95) * 100),
    }));
  }

  try {
    const chunkListJson = JSON.stringify(
      chunks.map(c => ({
        originalTitle: c.originalTitle,
        type: c.sectionKey,
        content: c.text,
        layer1_confidence: c.confidence,
        layer1_reasoning: c.reasoning
      })),
      null,
      2
    );

    const prompt = [
      `Sen bir CV chunk kalite denetçisisin. Sana 1. aşamada AI tarafından oluşturulmuş chunk listesi verilecek. Görevin ÜÇ AŞAMALI:`,
      ``,
      `AŞAMA A - KONTROL ET:`,
      `Her chunk için şunları kontrol et:`,
      `1. İçerikte başka bir bölüme ait başlık veya metin sızmış mı?`,
      `2. type alanı içerikle gerçekten uyumlu mu?`,
      `3. type: "personal" olan chunk'ta gerçek bir isim var mı?`,
      `4. Chunk'ın içeriği CV'deki gerçek metinle birebir tutarlı mı (özetlenmemiş, uydurulmamış)?`,
      ``,
      `AŞAMA B - GEREKİRSE DÜZELT:`,
      `- Sorun BARİZ ve KESİNSE (örnek: başka bölümün başlığı chunk'ın sonunda görünüyor) düzelt.`,
      `- EMİN DEĞİLSEN, DOKUNMA. Var olan doğru bir bilgiyi "iyileştirmeye" çalışma. Şüpheli ama kanıtlanmamış durumlarda içeriği OLDUĞU GİBİ bırak.`,
      `- ASLA yeni bilgi uydurma, ASLA CV'de olmayan bir şeyi ekleme.`,
      ``,
      `AŞAMA C - SKORLA (düzeltmeden SONRA, düzeltilmiş veya orijinal haline göre):`,
      `Her chunk için 0-100 arası confidence_score ver:`,
      `- 90-100: Kesinlikle doğru, sorun yok`,
      `- 70-89: Küçük belirsizlikler var ama genel olarak güvenilir`,
      `- 40-69: Ciddi şüphe var, içerik yanlış kategoride olabilir veya sızıntı olabilir`,
      `- 0-39: Büyük ihtimalle hatalı, kritik bilgi eksik veya karışık`,
      ``,
      `ÖNEMLİ KURALLAR:`,
      `- LOREM IPSUM VE PLACEHOLDER KURALI: 'Lorem ipsum' veya taslak placeholder metinleri şablon CV/mock veri olduğu için skor düşürme nedeni DEĞİLDİR. Yapı, kategori ve sınır doğruysa 'Lorem ipsum' içeren chunk'lara da 90-95 arası yüksek skor ver! Metnin 'Lorem ipsum' olması nedeniyle ASLA skoru cezalandırma.`,
      `- Skorunu DÜRÜST ver. Yüksek skor vermek için bir sebebin yoksa düşük ver. Skorları şişirme.`,
      `- confidence_score alanını ASLA sabit bir değerden (örn. her zaman 95) kopyalama, her chunk için GERÇEKTEN düşün ve o chunk'a özgü bir değer üret.`,
      ``,
      `JSON formatında döndür:`,
      JSON.stringify({
        chunks: [
          {
            originalTitle: "KİŞİSEL BİLGİLER",
            type: "personal",
            text: "düzeltilmiş veya orijinal metin...",
            duzeltildi: false,
            duzeltme_aciklamasi: "İçerik net ve uyumlu",
            confidence_score: 95
          }
        ]
      }, null, 2),
      ``,
      `İşlenecek chunk listesi:`,
      chunkListJson,
      ``,
      `Orijinal Ham CV Metni (referans için):`,
      rawText
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI Layer 2 inspection returned ${res.status}`);
    }

    const data = (await res.json()) as Record<string, any>;
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const costUsd = promptTokens * 0.00000015 + completionTokens * 0.0000006;

    if (prisma) {
      await prisma.aPICall.create({
        data: {
          model: "gpt-4o-mini",
          tokensIn: promptTokens,
          tokensOut: completionTokens,
          costUsd,
          endpoint: "quality_check",
          status: "SUCCESS",
        },
      }).catch((e: any) => console.error("[ChunkQualityService] Failed to log quality_check API call:", e));
    }

    const responseText = data.choices?.[0]?.message?.content as string;
    const parsed = JSON.parse(responseText);

    const items: any[] = Array.isArray(parsed.chunks) ? parsed.chunks : [];

    if (items.length === 0) {
      console.warn("[ChunkQualityService] Layer 2 returned empty chunks array, falling back to Layer 1.");
      return chunks.map(c => ({
        originalTitle: c.originalTitle,
        type: c.sectionKey,
        text: c.text,
        duzeltildi: false,
        confidence_score: Math.round((c.confidence ?? 0.95) * 100),
      }));
    }

    return items.map((item, idx) => {
      const fallbackChunk = chunks[idx] || chunks[0];
      return {
        originalTitle: item.originalTitle || fallbackChunk.originalTitle,
        type: item.type || fallbackChunk.sectionKey,
        text: (item.text || item.content || fallbackChunk.text).trim(),
        duzeltildi: Boolean(item.duzeltildi),
        duzeltme_aciklamasi: item.duzeltme_aciklamasi || undefined,
        confidence_score: typeof item.confidence_score === "number" ? item.confidence_score : 85,
      };
    });
  } catch (err: any) {
    console.error("[ChunkQualityService] inspectAndCorrectChunks failed:", err.message);
    if (prisma) {
      await prisma.aPICall.create({
        data: {
          model: "gpt-4o-mini",
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
          endpoint: "quality_check",
          status: "FAILED",
        },
      }).catch((e: any) => console.error("[ChunkQualityService] Failed to log quality_check failure:", e));
    }
    return chunks.map(c => ({
      originalTitle: c.originalTitle,
      type: c.sectionKey,
      text: c.text,
      duzeltildi: false,
      confidence_score: Math.round((c.confidence ?? 0.95) * 100),
    }));
  }
}

/**
 * KATMAN 3 — Hedefli Yeniden Deneme + Skorlama Prompt (Tekli Chunk)
 * gpt-4o-mini, response_format: json_object, temperature: 0
 */
export async function retryTargetedChunk(
  chunk: Layer2Chunk,
  rawText: string,
  lang: "tr" | "en",
  previousReason: string,
  prisma?: any
): Promise<Layer3Chunk> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[ChunkQualityService] No OPENAI_API_KEY — skipping Layer 3 targeted retry.");
    return {
      originalTitle: chunk.originalTitle,
      type: chunk.type,
      text: chunk.text,
      confidence_score: chunk.confidence_score,
      aciklama: "API key missing — keeping Layer 2 state",
    };
  }

  try {
    const prompt = [
      `Sen bir CV chunk'ının SON KEZ, en dikkatli şekilde yeniden işlenmesi için çağrıldın. Bu, bu chunk için yapılacak SON otomatik AI denemesi. Bundan sonra sistem otomatik kural tabanlı bir yönteme geçecek, bu yüzden mümkün olduğunca doğru ve dikkatli ol.`,
      ``,
      `Önceki değerlendirmede bu chunk düşük güven skoru aldı. Sebep:`,
      previousReason || "Kategorizasyon veya sınır belirsizliği",
      ``,
      `Sana verilenler:`,
      `- Bu chunk'ın CV'deki İLGİLİ HAM METNİ (extraction'dan gelen orijinal segment):`,
      rawText.slice(0, 3000),
      ``,
      `- Önceki (düşük skorlu) hali:`,
      JSON.stringify(chunk, null, 2),
      ``,
      `GÖREVİN:`,
      `1. Ham metni sıfırdan, dikkatlice incele.`,
      `2. Doğru başlığı (originalTitle), doğru kategoriyi (type) ve doğru, birebir korunmuş içeriği (text) belirle.`,
      `3. CV'de gerçekten var olan bilgiyi kullan, HİÇBİR ŞEY UYDURMA.`,
      `4. Emin değilsen bile elindeki en iyi tahminini ver - bu son deneme, boş bırakamazsın.`,
      `5. 'Lorem ipsum' veya taslak metinler şablon CV verisidir, skor düşürme nedeni DEĞİLDİR. Sınır ve kategori doğruysa yüksek skor (85-95) ver.`,
      `6. Sonunda, bu yeni üretimin için de dürüst bir confidence_score (0-100) ver. Bu son değerlendirmedir, skorunu olduğundan yüksek gösterme.`,
      ``,
      `JSON formatında döndür:`,
      JSON.stringify({
        originalTitle: "...",
        type: "...",
        text: "...",
        confidence_score: 85,
        aciklama: "bu chunk'ı nasıl belirlediğine dair kısa not"
      }, null, 2)
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI Layer 3 retry returned ${res.status}`);
    }

    const data = (await res.json()) as Record<string, any>;
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const costUsd = promptTokens * 0.00000015 + completionTokens * 0.0000006;

    if (prisma) {
      await prisma.aPICall.create({
        data: {
          model: "gpt-4o-mini",
          tokensIn: promptTokens,
          tokensOut: completionTokens,
          costUsd,
          endpoint: "targeted_retry",
          status: "SUCCESS",
        },
      }).catch((e: any) => console.error("[ChunkQualityService] Failed to log targeted_retry API call:", e));
    }

    const responseText = data.choices?.[0]?.message?.content as string;
    const parsed = JSON.parse(responseText);

    return {
      originalTitle: parsed.originalTitle || chunk.originalTitle,
      type: parsed.type || chunk.type,
      text: (parsed.text || parsed.content || chunk.text).trim(),
      confidence_score: typeof parsed.confidence_score === "number" ? parsed.confidence_score : 60,
      aciklama: parsed.aciklama || "Katman 3 yeniden işleme tamamlandı",
    };
  } catch (err: any) {
    console.error("[ChunkQualityService] retryTargetedChunk failed:", err.message);
    if (prisma) {
      await prisma.aPICall.create({
        data: {
          model: "gpt-4o-mini",
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
          endpoint: "targeted_retry",
          status: "FAILED",
        },
      }).catch((e: any) => console.error("[ChunkQualityService] Failed to log targeted_retry failure:", e));
    }
    return {
      originalTitle: chunk.originalTitle,
      type: chunk.type,
      text: chunk.text,
      confidence_score: chunk.confidence_score,
      aciklama: "Katman 3 hatası — Katman 2 hali korundu",
    };
  }
}
