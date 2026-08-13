# 📁 STAJ22001 — Staj Projesi Ana Deposu

Bu depo, 8 haftalık (40 iş günü) staj süreci boyunca geliştirilen tüm alt projeleri, deneysel çalışmaları ve ana staj projesi olan **Beacon** platformunu içermektedir.

---

## 🌐 Canlı Uygulama Bağlantıları

- **Canlı Production (Beacon):** [staj-22001.vercel.app](https://staj-22001.vercel.app)
- **Backend Servisi:** Render Cloud Engine

---

## 📂 Proje Klasör Yapısı ve Geliştirme Günleri

| Klasör | Günler / Süreç | Açıklama |
|:-------|:--------------:|:---------|
| [`threadlab-visualizer`](./threadlab-visualizer) | **2. Gün** | **ThreadLab Visualizer:** Web Workers ile dinamik görev dağıtımı (Load Balancing), Gantt şeması ile paralel işleme optimizasyonu ve zaman/performans ölçümleme laboratuvarı. |
| [`single-and-web-worker`](./single-and-web-worker) | **3. Gün** | **Main Thread vs. Web Worker:** Fibonacci hesaplaması üzerinden JavaScript'te UI donması problemini inceleyen ve Web Worker çözümünü gösteren interaktif React uygulaması. |
| [`astro-app`](./astro-app) | **4. - 6. Günler** | **Astro İskelet & Prototipler:** Modern web geliştirme, Astro framework mantığı, SSR vs SSG dinamikleri ve temel sayfa yapılarının incelendiği başlangıç projesi. |
| 🛰️ [`astro-project`](./astro-project) | **7. - 40. Günler** *(Ana Proje)* | **Beacon — RAG Tabanlı CV Analiz & Semantik Aday Arama Platformu:** Astro 5 (SSR), Express.js, Prisma 7, PostgreSQL (`pgvector HNSW`), Redis + BullMQ Worker Pool ve OpenAI (`GPT-4o-mini`, `text-embedding-3-small`) ile geliştirilen kurumsal İK karar destek platformu. |

---

## 🛰️ Ana Proje: Beacon Hakkında

Stajın **7. gününden 40. gününe kadar** odaklanılan ana proje **Beacon**, Retrieval-Augmented Generation (RAG) mimarisiyle CV'leri akıllıca analiz eder:

1. **PDF Parsing & Deep Chunking:** Canva ve çok sütunlu CV'leri layout-aware mantığıyla 3-katmanlı akıllı parçalama pipeline'ından geçirir.
2. **Vektörel İndeksleme:** Metin parçalarını OpenAI `text-embedding-3-small` ile 1536-boyutlu vektörlere dönüştürüp PostgreSQL `pgvector HNSW` ile saklar.
3. **Semantik Arama & Hibrit Reranking:** Doğal dildeki sorguları sert kriterler (*Hard Requirements*) ile eler ve GPT-4o-mini ile hibrit puanlama (%20 Vektör + %80 GPT) uygular.
4. **Worker Pool & Realtime:** BullMQ + Redis 4 paralel worker ile asenkron CV işleme ve Socket.io ile canlı ilerleme takibi sunar.

> 📖 Detaylı mimari dokümantasyon, kurulum adımları ve test sonuçları için [`astro-project/README.md`](./astro-project/README.md) dosyasını inceleyebilirsiniz.

---

## 👤 Geliştirici

**Ömer Abalı**  
Staj Dönemi: 2025 (8 Hafta / 40 İş Günü)  
GitHub: [@omerabali](https://github.com/omerabali)  
Repo: [STAJ22001](https://github.com/omerabali/STAJ22001)
