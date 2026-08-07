/**
 * SectionTaxonomy.ts (CV Bölüm Sözlüğü & Taksonomi Alanı)
 * Görevi: CV ayrıştırma ve sınıflandırma mantığında kullanılan temel alan sözlükleridir.
 * Türkçe ve İngilizce başlık etiketlerini (SECTION_LABELS, HEADINGS_TR, HEADINGS_EN) ve
 * yetenek normalizasyon haritasını (COMMON_SKILLS, SKILL_NORM_MAP) tutar.
 */

export const SECTION_LABELS: Record<string, string> = {
  personal:       "Kişisel Bilgiler",
  summary:        "Özet",
  experience:     "Deneyimler",
  education:      "Eğitim",
  skills:         "Yetenekler",
  projects:       "Projeler",
  certifications: "Sertifikalar",
  languages:      "Diller",
  publications:   "Yayınlar & Patentler",
  references:     "Referanslar",
};

export const HEADINGS_TR: Record<string, string[]> = {
  personal: [
    "kisisel bilgiler", "kisisel", "iletisim", "iletisim bilgileri",
    "iletisim & kisisel", "iletisim ve kisisel", "kisisel bilgiler & iletisim",
    "kisisel detaylar", "biyografi", "iletisim kanallari", "adres ve iletisim",
  ],
  summary: [
    "hakkimda", "ozet", "profil", "kisisel ozet", "kariyer hedefi",
    "kariyer ozeti", "ben kimim", "kisisel profil", "kisisel nitelikler",
    "profesyonel ozet", "hakknmda", "ozet bilgi", "genel ozet", "profil ozeti",
    "mesleki profil", "ozet gecmis", "kariyer vizyonu", "hakkimda & ozet",
  ],
  experience: [
    "deneyim", "is deneyimi", "is deneyimleri", "calisma gecmisi",
    "profesyonel deneyim", "kariyer gecmisi", "is tecrubesi", "tecrubeler",
    "tecrube", "staj", "stajlar", "is gecmisi", "mesleki deneyim",
    "deneyimler", "nn deneynmn", "deneynmn", "nn deneyim",
    "kronolojik deneyim", "kronolojik is gecmisi", "is kronolojisi",
    "calisma takvimi", "pozisyonlar", "kronolojik deneyim i", "kronolojik deneyim 1",
    "is tecrubeleri", "mesleki tecrube", "mesleki gecmis", "calisma hayati",
    "staj tecrubeleri", "deneyimlerim", "is tecrubelerim", "staj deneyimlerim",
    "is deneyimleri ve stajlar", "calisma gecmisi ve tecrubeler", "is tecrubesi & projeler",
  ],
  education: [
    "egitim", "ogrenim", "egitim bilgileri", "egitim gecmisi",
    "akademik gecmis", "okullar", "universite", "lisans",
    "yuksek lisans", "doktora", "enntnm", "egntnm",
    "egitim & akademik", "akademik", "egitim ve akademik", "akademik bilgiler",
    "ogrenim bilgileri", "ogrenim gecmisi", "egitim hayatim", "egitim durumu",
    "akademik nitelikler", "okul ve lisanslar", "egitim nitelikleri", "egitim ve ogretim",
    "egitim ve nitelikler", "egitim & nitelikler", "egitim ve sertifikalar", "egitim & sertifikalar",
    "egitimlerim", "akademik egitim", "egitim ve kurslar", "egitim & kurslar",
  ],
  skills: [
    "yetenekler", "beceriler", "teknik beceriler", "teknik yetenekler",
    "uzmanlik alanlari", "teknolojiler", "diller & teknolojiler",
    "araclar", "yetenekler & araclar", "bilgisayar becerileri",
    "yetkinlik grafikleri", "yetkinlikler", "teknik yetkinlikler",
    "skill grafikleri", "beceriler & araclar", "yetkinlik alanlari",
    "yetkinlikler (barlar)", "teknik beceri grafikleri",
    "yetkinlik matrisi", "teknik adaptasyon", "beceri matrisi", "yetenek matrisi",
    "altyapi metrikleri", "altyapı metrikleri", "metrikler",
    "yetenek & beceriler", "yetenekler ve beceriler", "beceriler ve yetenekler",
    "bilgisayar bilgisi", "teknik yetenekler & araclar", "teknoloji stack",
    "kullandigi teknolojiler", "yetenekler / beceriler", "teknik nitelikler",
    "yetenek ve yetkinlikler",
  ],
  projects: [
    "projeler", "projelerim", "proje deneyimi", "proje deneyimleri", "kisisel projeler",
    "akademik projeler", "portfolyo", "gelistirilen projeler",
    "proje gecmisi", "projeler ve uygulamalar", "onemli projeler",
    "tamamlanan projeler", "proje calismalari", "projeler & uygulamalar",
    "kisisel ve akademik projeler", "key projects", "proje tecrubeleri", "proje tecrubesi",
  ],
  certifications: [
    "sertifikalar", "sertifikalarim", "sertifikasyonlar", "belgeler",
    "kurslar", "seminerler", "sertifika & kurslar", "egitim ve sertifikalar",
    "sertifikalar ve egitimler", "sertifikalar ve egitim", "sertifiklar ve egitimler", "sertifiklar ve egitim",
    "sertifika ve egitimler", "sertifikalar & egitimler", "sertifikalar & egitim", "egitimler ve sertifikalar",
    "sertnfnkalar", "sertnfnkalarim", "lisans / sertifikalar", "lisans ve sertifikalar",
    "sertifikalar ve lisanslar", "oduller", "odul", "basarilar", "basari", "odullerim",
    "basarilarim", "oduller & sertifikalar", "sertifikalar & oduller", "sertifikalar ve oduller",
    "sertifikalarim ve basarilarim", "sertifika ve basarilar", "burslar ve oduller",
    "burs ve oduller", "sertifikalar ve basarilar", "sertifikalar ve kurslar", "sertifikalar & kurslar",
    "sertifika ve kurslar", "alinan sertifikalar", "katilim sertifikalari",
  ],
  languages: [
    "diller", "yabanci dil", "yabanci diller", "dil bilgisi",
    "konustugu diller", "dnller", "dnllerim",
    "dil seviyeleri", "yabanci diller (yildizlar)", "dil yetkinligi",
    "dil bilgisi & seviyeler", "yabanci dil seviyeleri", "dil & seviye",
    "yabancidiller", "dil", "konusulan diller", "dil yetkinlikleri", "bildigi diller",
  ],
  publications: [
    "yayinlar", "yayinlarim", "patentler", "yayinlar & patentler",
    "yayinlar ve patentler", "akademik yayinlar", "patentlerim",
    "eserler", "bilimsel yayinlar", "secilmis yayinlar", "patent matrisi",
    "patent matrisi (structural json tuzagi)", "yayinlar ve bildiriler",
    "makaleler ve bildiriler", "akademik yayinlar ve patentler",
  ],
  references: [
    "referanslar", "referans", "is referanslari", "kurumsal referanslar",
    "profesyonel referanslar", "referanslarim", "referans listesi",
  ],
};

export const HEADINGS_EN: Record<string, string[]> = {
  personal: [
    "personal info", "personal information", "contact", "contact information",
    "contact info", "personal details", "personal", "contact details",
    "personal profile details", "contact & personal info",
  ],
  summary: [
    "about", "about me", "summary", "profile", "objective",
    "career objective", "professional summary", "overview",
    "introduction", "executive summary", "personal summary",
    "career summary", "professional profile", "about me & summary",
  ],
  experience: [
    "experience", "work experience", "employment", "employment history",
    "professional experience", "career history", "work history", "internships",
    "chronological experience", "work chronology", "work experience & history",
    "employment background", "work histories", "consulting engagements",
    "work history & experience",
  ],
  education: [
    "education", "academic background", "academic history",
    "educational background", "qualifications", "university",
    "degrees", "educational qualifications", "education & academic",
    "educational information", "education information", "academic degrees",
    "academic background & education", "higher education", "education and training",
    "education & training", "education & qualifications", "education and qualifications",
  ],
  skills: [
    "skills", "technical skills", "core competencies", "expertise",
    "technologies", "skills & tools", "key skills",
    "skill charts", "skill bars", "technical competencies",
    "competence matrix", "technical adaptation", "skills matrix",
    "technical proficiencies", "technical skills & tools",
    "skills and competencies", "core competencies & skills", "technical capabilities",
  ],
  projects: [
    "projects", "project experience", "project experiences", "personal projects",
    "academic projects", "portfolio", "selected projects",
    "recent projects", "project history", "projects & applications",
    "key projects & achievements", "featured projects", "projects & experience", "projects and experience",
  ],
  certifications: [
    "certifications", "certificates", "licenses", "credentials",
    "completed courses", "professional training", "trainings",
    "certificates and trainings", "certificates and training", "certifications and trainings",
    "certifications and training", "certificates & trainings", "certifications & trainings",
    "trainings & certificates", "trainings and certificates", "certifications & courses",
    "certifications and courses", "certificates and courses", "courses & certifications",
    "awards", "award", "achievements", "achievement", "honors & awards", "honors", "awards & honors",
    "key achievements", "selected achievements", "certifications & licenses",
    "licenses & certifications", "certifications & awards", "grants and honors", "grants & honors",
  ],
  languages: [
    "languages", "language skills", "languages spoken",
    "language levels", "foreign languages", "language proficiency", "language",
    "spoken languages", "languages & proficiency",
  ],
  publications: [
    "publications", "patents", "publications & patents",
    "publications and patents", "academic publications", "scientific publications",
    "selected publications", "patents & publications", "publications & papers",
  ],
  references: [
    "references", "reference", "referees", "recommendations", "professional references",
    "board positions & references", "references & recommendations",
  ],
};

export const COMMON_SKILLS = [
  "JavaScript", "TypeScript", "Node.js", "React", "Vue", "Angular", "Python",
  "Java", "C++", "C#", "Go", "Rust", "SQL", "PostgreSQL", "MongoDB",
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "HTML", "CSS", "Git",
  "Tailwind", "Next.js", "Express", "Prisma", "Supabase", "REST API",
];

export const SKILL_NORM_MAP: Record<string, string> = {
  "reactjs":      "React",
  "react.js":     "React",
  "react-js":     "React",
  "react native": "React Native",
  "reactnative":  "React Native",
  "nodejs":       "Node.js",
  "node.js":      "Node.js",
  "expressjs":    "Express",
  "express.js":   "Express",
  "javascript":   "JavaScript",
  "typescript":   "TypeScript",
  "postgresql":   "PostgreSQL",
  "postgres":     "PostgreSQL",
  "mongodb":      "MongoDB",
  "nextjs":       "Next.js",
  "next.js":      "Next.js",
  "tailwind css": "Tailwind",
  "tailwindcss":  "Tailwind",
};
