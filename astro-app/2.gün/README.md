# Gün 2 — Dinamik İçerik, Content Collections ve Blog Sistemi

Birinci günde geliştirilen statik portfolyo projesinin üzerine dinamik içerik katmanı eklenmiş halidir. Markdown/MDX tabanlı blog sistemi, content collections yapısı, `getStaticPaths` ile dinamik route üretimi ve build-time veri çekme konuları uygulanmıştır.

## Kullanılan Teknolojiler

- Astro 5 + TypeScript
- Content Collections (`astro:content`, Zod şema doğrulaması)
- Markdown (`.md`) + MDX (`.mdx`) — `@astrojs/mdx` entegrasyonu
- `getStaticPaths` ile dinamik route üretimi
- Build-time `fetch` (JSONPlaceholder API)

## Site Sayfaları

| Sayfa | Açıklama |
|-------|----------|
| `/` | Ana sayfa — tanıtım bölümü |
| `/hakkimda` | Beceriler ve iletişim |
| `/projeler` | Proje kartları (Gün 1'den) |
| `/blog` | Yazı listesi, kategori filtreleri, build-time fetch örneği |
| `/blog/[slug]` | Markdown ve MDX yazıların detay sayfası |
| `/blog/kategori/[kategori]` | Kategoriye göre filtrelenmiş yazı listesi |

## Proje Yapısı

```
src/
├── content/
│   ├── blog/
│   │   ├── astro-nedir.md
│   │   ├── css-grid-ipuclari.md
│   │   ├── js-async-await.md
│   │   └── mdx-demo.mdx        ← Astro bileşeni gömülü MDX örneği
│   └── content.config.ts       ← Zod şemalı koleksiyon tanımı
├── pages/
│   └── blog/
│       ├── index.astro          ← Yazı listesi + fetch örneği
│       ├── [slug].astro         ← Dinamik yazı detay route
│       └── kategori/
│           └── [kategori].astro ← Dinamik kategori filtre route
└── components/
    ├── PostCard.astro
    ├── CategoryFilter.astro
    └── Callout.astro            ← MDX içinde kullanılan bileşen
```

## Gün 1 → Gün 2 Karşılaştırması

| Gün 1 | Gün 2 |
|-------|-------|
| Statik sayfalar | + Content Collections |
| Inline veri dizileri | + Markdown / MDX dosyaları |
| Dosya tabanlı yönlendirme | + `[slug].astro` dinamik route |
| — | + `getStaticPaths` |
| — | + Build-time `fetch` |
| — | + Kategori filtreleme |

## Nasıl Çalıştırılır?

```sh
npm install
npm run dev
```

Tarayıcıda geliştirme ortamı açılır. Üretim sürümü için:

```sh
npm run build
```

---

## Staj Defteri

**Tarih:** … / … / 2026
**Staj Konusu:** Astro Web Framework — Dinamik İçerik, Content Collections ve Blog Sistemi
**Staj Günü:** …

### Yapılan Çalışmalar

Staj programının Astro eğitim bölümünün ikinci gününde, birinci günde oluşturulan statik portfolyo projesine dinamik içerik katmanı eklenerek bir blog sistemi geliştirilmiştir. Çalışmaya içerik koleksiyonu yapısının kurulmasıyla başlanmış; blog yazılarının başlık, açıklama, tarih ve kategori alanları şema doğrulamasıyla tip güvenli biçimde tanımlanmıştır. Koleksiyon kapsamında Markdown ve MDX formatlarında içerik dosyaları hazırlanmış, MDX formatında Astro bileşeninin doğrudan yazı gövdesine gömülebildiği gözlemlenerek iki format arasındaki fark karşılaştırılmıştır. Blog listesi sayfasında koleksiyondaki yazılar tarihe göre sıralanarak kart bileşenleriyle listelenmiştir. Yazı detay sayfası dinamik route yapısıyla oluşturulmuş; derleme sırasında her içerik dosyası için otomatik olarak ayrı bir statik HTML sayfası üretilmiştir. Kategori filtreleme için ikinci bir dinamik route tanımlanmış ve her kategori için ayrı statik sayfalar oluşturulmuştur. Ayrıca harici bir API'den derleme sırasında veri çekilerek sayfaya yansıtılması sağlanmış; bu yöntemle Astro'nun build-time veri getirme yaklaşımı uygulamalı olarak incelenmiştir. Geliştirme sürecinin sonunda tüm sayfalar ve navigasyon bağlantıları test edilmiş, üretim derlemesi alınarak dinamik içeriklerin statik dosyalara başarıyla dönüştürüldüğü doğrulanmıştır.

---

*Portfolyo sitesindeki örnek içerikler ve iletişim bilgileri kişisel verilerle güncellenmelidir.*
