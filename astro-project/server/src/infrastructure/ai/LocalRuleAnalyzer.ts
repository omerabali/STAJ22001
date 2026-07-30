import { extractLocalSkills } from "../../domain/cv/HeadingMatcher.js";

export function simulateAiAnalysis(text: string, lang: "tr" | "en") {
  if (
    text.includes("DATA CORRUPTED") ||
    text.includes("ENCRYPTION KEY REQUIRED") ||
    text.includes("STREAM_BLOCKED_BY_CYPHER")
  ) {
    throw new Error("Geçersiz veya bozuk PDF verisi. AI analizi yapılamaz.");
  }

  let extractedRole = lang === "en" ? "Software Engineer" : "Yazılım Geliştirici";
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const emojiStripRx = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA9F}🚀📊🛠️💼🎓🔧⚙️📌📍✅❌⭐★☆▶►]/gu;

  const titleKeywordsTR = [
    "mühendis", "muhendis", "geliştirici", "gelistirici", "developer",
    "mimar", "architect", "tasarımcı", "tasarimci", "designer",
    "analist", "analyst", "yönetici", "yonetici", "manager",
    "uzman", "specialist", "lead", "direktör", "direktor", "director",
    "koordinatör", "koordinator", "danışman", "danishman",
    "consultant", "sorumlu", "başkan", "baskan", "stajyer", "intern", "satış", "satis"
  ];

  for (const line of lines.slice(0, 20)) {
    const cleaned = line.replace(emojiStripRx, "").trim();
    if (cleaned.length < 4 || cleaned.length > 80) continue;
    const lower = cleaned.toLowerCase();
    const isTitle = titleKeywordsTR.some((kw) => lower.includes(kw));
    if (isTitle) {
      extractedRole = cleaned;
      break;
    }
  }

  const foundSkills = extractLocalSkills(text);
  const atsScore = Math.min(60 + foundSkills.length * 6, 95);

  const trData = {
    strengths: [
      `${extractedRole} alanındaki deneyimi pratik yeteneklerle birleştirme becerisi — ${foundSkills.length > 0 ? foundSkills.slice(0, 3).join(", ") : "genel tecrübe"} yetkinliklerine ve uygulamalı altyapıya sahip.`,
      `${extractedRole} pozisyonuna uygun düzenli CV mimarisi — geçmiş sorumlulukları ile yetkinliklerini net biçimde sergilemektedir.`
    ],
    weaknesses: [
      "Büyük ölçekli sistem optimizasyonu ve DevOps/veri metrikleri eksikliği — Karmaşık projelerdeki ölçülebilir başarı çıktılarının CV'de detaylandırılmaması.",
      "Özgeçmişteki proje başarı metriklerinin eksikliği — Somut veri ve rakamsal katkıların ifade edilmesi gelişim sağlayacaktır."
    ],
    suggestions: [
      {
        priority: "high",
        timeframe: "Kısa Vadeli (1-3 Ay)",
        action: `Adayın ${extractedRole} alanındaki proje tecrübelerini ve teknik derinliğini detaylandırın.`,
        question: `Geçmiş ${extractedRole} projelerinizde karşılaştığınız en zorlu teknik veya operasyonel sorunu nasıl çözdünüz?`
      },
      {
        priority: "medium",
        timeframe: "Orta Vadeli",
        action: "Takım çalışması, iletişim ve kriz yönetimi becerilerini mülakatta test edin.",
        question: "Ekip içerisinde teknik görüş ayrılığı yaşadığınızda nasıl bir yol izlersiniz?"
      }
    ],
    interviewQuestions: [
      {
        question: `Geçmiş ${extractedRole} projelerinizde karşılaştığınız en zorlu teknik veya operasyonel sorunu nasıl çözdünüz?`,
        category: "Teknik Yetkinlik",
        expectedAnswer: "Problem çözme yaklaşımı ve metodolojisini somut örneklerle açıklaması beklenir."
      },
      {
        question: "Ekip içerisinde teknik veya iş süreci görüş ayrılığı yaşadığınızda nasıl bir uzlaşı sağlarsınız?",
        category: "Davranışsal Soru",
        expectedAnswer: "İletişim, empati ve şirket hedeflerini önceliklendirme becerilerini ifade etmesi beklenir."
      }
    ]
  };

  return {
    atsScore,
    role: extractedRole,
    skills: foundSkills,
    ...trData,
  };
}
