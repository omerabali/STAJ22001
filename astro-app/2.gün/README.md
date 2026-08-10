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
---

*Portfolyo sitesindeki örnek içerikler ve iletişim bilgileri kişisel verilerle güncellenmelidir.*
