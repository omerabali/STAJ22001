/**
 * OpenAiSectionSegmenter.ts (OpenAI Destekli CV Bölümleme & Sınıflandırıcı)
 * Görevi: Karışık veya bozuk düzenli CV metinlerini GPT-4o-mini'ye göndererek
 * metni kesin sınırlar ve güven skorlarıyla mantıksal CV bölümlerine (`personal`, `experience`, `education`, `skills` vb.) ayırır.
 */
import { SECTION_LABELS } from "../../domain/cv/SectionTaxonomy.js";

const OPENAI_SECTION_KEYS = Object.keys(SECTION_LABELS).join(" | ");

export async function segmentCvWithAI(
  text: string,
  lang: "tr" | "en",
  prisma?: any
): Promise<{ sectionKey: string; customName?: string; originalTitle?: string; text: string; confidence: number; reasoning: string }[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[AI Segment] No OPENAI_API_KEY — skipping AI segmentation.");
    return [];
  }

  try {
    const prompt = [
      `Sen uzman bir CV Ayrıştırma ve Bölümleme Asistanısın (CV Section Segmenter).`,
      `Görevin: Verilen ham CV metnini incelemek ve metni anlamlı, bağımsız BÖLÜM CHUNK'larına (sections) ayırmaktır.`,
      ``,
      `BÖLÜM TİPLERİ (sadece şu 8 ana tipi kullan):`,
      `- personal: Kişisel bilgiler (İsim, soyad, e-posta, telefon, adres, LinkedIn, GitHub, doğum tarihi)`,
      `- summary: Özet, hakkımda, profil, kariyer hedefi`,
      `- experience: İş deneyimi, çalışma geçmişi (HER İŞ GİRDİSİ İÇİN MÜMKÜN OLDUĞUNCA AYRI CHUNK)`,
      `- education: Eğitim bilgileri, okullar, dereceler, yüksek lisans, lise`,
      `- skills: Teknik beceriler, programlama dilleri, araçlar, framework'ler (doğal dil DEĞİL)`,
      `- languages: Konuşulan doğal diller ve seviyeleri (Türkçe, İngilizce, Almanca vb. — teknik araç DEĞİL)`,
      `- certifications: Sertifikalar, kurslar, ödüller`,
      `- projects: Projeler`,
      `- references: Referanslar`,
      ``,
      `Çıktıyı SADECE şu JSON formatında ver:`,
      JSON.stringify({
        chunks: [
          {
            type: "personal",
            originalTitle: "KİŞİSEL BİLGİLER",
            content: "Ahmet Yılmaz\nSoftware Engineer\n+90 555 111 22 33\nemail@example.com",
            confidence: 0.98,
            reasoning: "Üst bilgi bloğu ve iletişim detayları net"
          }
        ]
      }, null, 2),
      ``,
      `Raw CV Text:`,
      text
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
        temperature: 0.1,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI returned ${res.status}`);

    const data = await res.json() as Record<string, any>;
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const costUsd = (promptTokens * 0.00000015) + (completionTokens * 0.00000060);

    if (prisma) {
      await prisma.aPICall.create({
        data: {
          model: "gpt-4o-mini",
          tokensIn: promptTokens,
          tokensOut: completionTokens,
          costUsd,
          endpoint: "chat",
          status: "SUCCESS"
        }
      }).catch((e: any) => console.error("[AI Segment] Failed to log API call:", e));
    }

    const responseText = data.choices?.[0]?.message?.content as string;
    const parsed = JSON.parse(responseText);

    const typeMap: Record<string, string> = {
      personal_info: "personal",
      personal: "personal",
      summary: "summary",
      experience: "experience",
      education: "education",
      skills: "skills",
      certifications: "certifications",
      projects: "projects",
      publications: "publications",
      awards: "certifications",
      languages: "languages",
      volunteer: "experience",
      references: "references",
      other: "other"
    };

    const items = Array.isArray(parsed.chunks) ? parsed.chunks : (Array.isArray(parsed.sections) ? parsed.sections : []);

    return items
      .filter((s: any) => s && typeof (s.content || s.text) === "string" && (s.content || s.text).trim().length > 0)
      .map((s: any) => {
        const rawType = (s.type || "other").toLowerCase();
        const mappedKey = typeMap[rawType] || "other";
        const contentText = (s.content || s.text || "").trim();
        const title = s.originalTitle || SECTION_LABELS[mappedKey] || "Bölüm";
        return {
          sectionKey: mappedKey,
          customName: title,
          originalTitle: title,
          type: rawType,
          text: contentText,
          confidence: typeof s.confidence === "number" ? s.confidence : 0.95,
          reasoning: s.reasoning || "AI dinamik bölüm tespiti"
        };
      });
  } catch (err: any) {
    console.error("[AI Segment] segmentCvWithAI failed:", err);
    if (prisma) {
      await prisma.aPICall.create({
        data: {
          model: "gpt-4o-mini",
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
          endpoint: "chat",
          status: "FAILED"
        }
      }).catch((e: any) => console.error("[AI Segment] Failed to log API call failure:", e));
    }
    return [];
  }
}
//başlıksız bir kısım gördü mesela onu ai gönder ve bu kısmın ne olduğunu bul diyoruz 
export async function classifySectionWithAI(
  sectionText: string,
  currentKey: string,
  lang: "tr" | "en",
  prisma?: any
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return currentKey;

  try {
    const prompt = `Aşağıdaki CV bölüm metnini incele ve en uygun bölüm tipini seç.
Sadece şu seçeneklerden BİRİNİ küçük harfle döndür: ${OPENAI_SECTION_KEYS}

Metin:
"${sectionText.slice(0, 400)}"

Yanıtın SADECE tek bir kelime (bölüm anahtarı) olmalıdır.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    if (!res.ok) return currentKey;

    const data = await res.json() as Record<string, any>;
    const rawChoice = (data.choices?.[0]?.message?.content || "").trim().toLowerCase();
    const validKey = Object.keys(SECTION_LABELS).find((k) => k.toLowerCase() === rawChoice);
    return validKey ?? currentKey;
  } catch {
    return currentKey;
  }
}
