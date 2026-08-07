<div align="center">

<img src="public/mixboard-image.png" alt="Beacon Logo" width="160" />

# Beacon

### RAG Tabanlı CV Analiz ve Semantik Aday Arama Platformu

**Staj Projesi | 8 Hafta | Full-Stack Geliştirme**

[![Status](https://img.shields.io/badge/Staj_Projesi-Tamamland%C4%B1-059669?style=for-the-badge&logo=github-actions)](https://github.com/omerabali/STAJ22001)
[![AI](https://img.shields.io/badge/AI-RAG_Powered-2563eb?style=for-the-badge&logo=openai)](https://openai.com)
[![Stack](https://img.shields.io/badge/Stack-Astro_Express_PostgreSQL-7c3aed?style=for-the-badge&logo=astro)](https://astro.build)
[![Queue](https://img.shields.io/badge/Queue-BullMQ_Worker_Pool-dc2626?style=for-the-badge&logo=redis)](https://bullmq.io)
[![Vector](https://img.shields.io/badge/Vector_DB-pgvector_HNSW-0ea5e9?style=for-the-badge&logo=postgresql)](https://github.com/pgvector/pgvector)
[![Node](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Redis_7-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com)

<br/>

**Retrieval-Augmented Generation (RAG)** mimarisi ile özgeçmişleri akıllıca analiz eden,<br/>
vektörel veritabanı araması ile en uygun adayları bulan ve GPT destekli hibrit sıralama ile<br/>
sonuçları değerlendiren kurumsal düzeyde bir İK (İnsan Kaynakları) platformu.

<br/>

[Proje Hakkında](#proje-hakkında) · [Staj Süreci](#staj-süreci-ve-geliştirme-takvimi) · [Öğrenme Çıktıları](#öğrenme-çıktıları-ve-kazanımlar) · [Teknoloji Yığını](#teknoloji-yığını) · [Sistem Mimarisi](#sistem-mimarisi) · [Temel Özellikler](#temel-özellikler)<br/>
[RAG Pipeline](#rag-pipeline-detayları) · [Veritabanı Şeması](#veritabanı-şeması) · [Worker Pool](#worker-pool-mimarisi) · [Arama Motoru](#arama-ve-sıralama-motoru) · [Güvenlik](#güvenlik-mimarisi) · [Proje Yapısı](#proje-yapısı)<br/>
[Kurulum](#kurulum-ve-çalıştırma) · [API Referansı](#api-endpoint-referansı) · [Performans](#performans-metrikleri) · [Kullanıcı Senaryoları](#kullanıcı-senaryoları) · [Zorluklar](#karşılaşılan-zorluklar-ve-çözümler) · [Geliştirici](#geliştirici)

</div>

<br/>

<div align="center">

## Proje Hakkında

</div>

**Beacon**, 8 haftalık (39 iş günü) bir staj sürecinde sıfırdan tasarlanıp geliştirilen, **RAG (Retrieval-Augmented Generation)** mimarisine dayanan kurumsal bir CV analiz ve aday arama platformudur. Proje, modern web geliştirme, yapay zeka entegrasyonu, veritabanı tasarımı ve DevOps konularında kapsamlı bir öğrenme süreci içermektedir.

### Çözdüğü Problem

Geleneksel aday tarama süreçlerinde İK uzmanları yüzlerce CV'yi manuel olarak okuyup değerlendirmek zorunda kalır. Bu süreç hem zaman hem de doğruluk açısından verimsizdir. Beacon bu problemi dört temel yaklaşımla çözer:

1. **CV'leri otomatik analiz eder**: PDF'ten metin çıkarma, akıllı bölümleme ve GPT-4o-mini ile SWOT analizi.
2. **Semantik arama yapar**: Doğal dilde "React bilen, 3 yıl deneyimli frontend geliştirici" gibi sorgularla vektörel aday eşleştirme.
3. **Hibrit sıralama uygular**: Vektör benzerliği (%40) + GPT uygunluk değerlendirmesi (%60) ile en doğru sonuçları üretir.
4. **Gerçek zamanlı işleme sunar**: BullMQ worker pool ile paralel CV işleme ve Socket.io ile canlı ilerleme bildirimleri.

### Proje Kapsamı

| Metrik | Değer |
|:-------|:------|
| **Toplam Geliştirme Süresi** | 8 Hafta (39 İş Günü) |
| **Frontend Sayfa Sayısı** | 15+ Astro sayfası |
| **Backend Endpoint Sayısı** | 20+ REST API endpoint |
| **Veritabanı Tablo Sayısı** | 8 tablo (PostgreSQL + pgvector) |
| **AI Entegrasyon Noktası** | 4 farklı OpenAI kullanım noktası |
| **TypeScript Dosya Sayısı** | 80+ frontend + backend modülü |
| **Mimari Desen** | Clean Architecture (Domain, Infrastructure, Application) |

<br/>

<div align="center">

## Staj Süreci ve Geliştirme Takvimi

</div>

Bu proje 8 haftalık bir staj sürecinde aşamalı olarak geliştirilmiştir. Her hafta belirli bir odak alanı ve öğrenme hedefi bulunmaktadır:

| Hafta | Odak Alanı | Geliştirilen Özellikler | Öğrenilenler |
|:-----:|:-----------|:------------------------|:-------------|
| **1** | Temel Kurulum ve Araştırma | Astro framework kurulumu, proje yapılandırması, React ve Web Workers araştırması | Modern frontend framework'leri, SSR vs SSG kavramı |
| **2** | Backend Temelleri | Express.js + TypeScript sunucusu, Prisma 7 ORM, Supabase PostgreSQL entegrasyonu, JWT kimlik doğrulama | RESTful API tasarımı, ORM kullanımı, JWT mekanizması |
| **3** | Frontend ve Kimlik Doğrulama | Login, Register, Şifremi Unuttum sayfaları, Admin ve Aday panelleri, Dashboard iskelet yapısı, RLS politikaları | Rol bazlı erişim kontrolü, Supabase RLS, responsive tasarım |
| **4** | CV İşleme Pipeline | PDF metin çıkarma (layout-aware), akıllı bölümleme (chunking), OpenAI embedding üretimi, pgvector entegrasyonu, CV yükleme ve toplu işleme UI | NLP temelleri, vektörel veritabanı, embedding kavramı |
| **5** | AI Analiz ve Semantik Arama | GPT-4o-mini SWOT analizi, semantik aday arama endpoint'i, hibrit sıralama (Reranking), aday profil ve karşılaştırma sayfaları | Prompt engineering, cosine similarity, reranking stratejileri |
| **6** | Clean Architecture ve Kuyruk | Clean Architecture refaktörü, Docker + Redis kurulumu, BullMQ worker pool (4 eşzamanlı işçi), Socket.io canlı bildirimler | Yazılım mimarisi desenleri, mesaj kuyrukları, WebSocket |
| **7** | Benchmark ve Optimizasyon | Worker pool benchmark testleri (%67.6 performans artışı), maliyet loglama, chunk kalite izleme, arama geçmişi | Performans testi ve ölçümleme, optimizasyon teknikleri |
| **8** | Mobil Uyumluluk ve Polish | Tüm sayfalarda responsive tasarım, hata düzeltme turu, UI iyileştirmeleri, dokümantasyon, proje teslimi | Mobil uyumluluk, cross-browser test, proje teslim süreci |

<br/>

<div align="center">

## Öğrenme Çıktıları ve Kazanımlar

</div>

Bu staj süreci boyunca aşağıdaki teknik ve profesyonel yetkinlikler kazanılmıştır:

### Teknik Kazanımlar

**Yapay Zeka ve NLP**
- OpenAI API entegrasyonu (GPT-4o-mini ve text-embedding-3-small)
- RAG (Retrieval-Augmented Generation) mimarisi tasarımı ve uygulaması
- Prompt engineering ve prompt enjeksiyonu güvenlik önlemleri
- Vektörel benzerlik hesaplama (cosine similarity) ve HNSW indeksleme
- Hibrit sıralama (reranking) algoritmaları

**Backend Geliştirme**
- Express.js ile RESTful API tasarımı ve uygulaması
- TypeScript ile tip güvenli sunucu geliştirme
- Prisma 7 ORM ile veritabanı yönetimi ve migration
- BullMQ ile asenkron iş kuyruğu ve worker pool mimarisi
- JWT tabanlı kimlik doğrulama ve yetkilendirme
- Socket.io ile gerçek zamanlı WebSocket iletişimi
- Zod ile runtime şema doğrulama

**Frontend Geliştirme**
- Astro 7 framework ile SSR tabanlı web uygulaması
- Tailwind CSS 4 ile modern responsive tasarım
- TypeScript ile modüler frontend script mimarisi
- Chart.js ile interaktif veri görselleştirme
- Socket.io Client ile canlı bildirim sistemi

**Veritabanı ve Altyapı**
- PostgreSQL veritabanı tasarımı ve normalizasyonu
- pgvector eklentisi ile vektörel veri depolama
- Docker Compose ile konteyner yönetimi
- Redis ile kuyruk ve önbellek yönetimi
- Supabase platformu kullanımı (Auth, Storage, RLS)

**Yazılım Mühendisliği**
- Clean Architecture (Domain, Infrastructure, Application katmanları)
- SOLID prensipleri uygulaması
- Git versiyon kontrolü ve branch stratejisi
- Benchmark testleri ve performans ölçümleme
- API maliyet takibi ve optimizasyonu

### Profesyonel Kazanımlar
- Bağımsız proje yönetimi ve planlama
- Teknik dokümantasyon hazırlama
- Problem çözme ve hata ayıklama (debugging)
- Kod kalitesi ve bakımı konusunda bilinç
- Proje sunumu ve teslim süreci deneyimi

<br/>

<div align="center">

## Teknoloji Yığını

</div>

### Frontend

| Teknoloji | Versiyon | Kullanım Amacı |
|:----------|:--------:|:---------------|
| **Astro** | 7.x | SSR destekli web framework, sayfa tabanlı routing |
| **Tailwind CSS** | 4.x | Utility-first responsive tasarım |
| **TypeScript** | 5.x | Tip güvenli frontend script'leri |
| **Socket.io Client** | 4.x | Gerçek zamanlı CV işleme bildirimleri |
| **Chart.js** | 4.x | Raporlama sayfasında grafikler ve istatistikler |

### Backend

| Teknoloji | Versiyon | Kullanım Amacı |
|:----------|:--------:|:---------------|
| **Express.js** | 4.x | RESTful API sunucusu |
| **TypeScript** | 5.x | Tip güvenli backend geliştirme |
| **Prisma** | 7.x | Type-safe ORM ve veritabanı migration yönetimi |
| **BullMQ** | 6.x | Asenkron iş kuyruğu ve worker pool yönetimi |
| **Socket.io** | 4.x | WebSocket ile gerçek zamanlı istemci bildirimleri |
| **Multer** | 1.x | Dosya yükleme middleware'i |
| **Zod** | 3.x | Runtime şema doğrulama (API giriş/çıkış) |
| **bcrypt** | 5.x | Şifre hashleme |
| **jsonwebtoken** | 9.x | JWT tabanlı oturum yönetimi |

### Veritabanı ve Altyapı

| Teknoloji | Kullanım Amacı |
|:----------|:---------------|
| **PostgreSQL** (Supabase) | Ana ilişkisel veritabanı |
| **pgvector** (HNSW) | 1536 boyutlu vektör depolama ve benzerlik araması |
| **Redis** (Docker) | BullMQ kuyruk deposu ve iş durumu izleme |
| **Docker Compose** | Redis konteyner orkestrasyonu |
| **Supabase Storage** | CV dosyası (PDF) depolama |

### Yapay Zeka ve NLP

| Teknoloji | Kullanım Amacı |
|:----------|:---------------|
| **OpenAI GPT-4o-mini** | CV SWOT analizi, aday sıralama, arama niyeti ayrıştırma |
| **OpenAI text-embedding-3-small** | 1536 boyutlu semantik vektör üretimi |
| **Prompt Injection Guard** | Zararlı prompt enjeksiyonu tespiti ve engelleme |

<br/>

<div align="center">

## Sistem Mimarisi

</div>

Aşağıdaki diyagram sistemin genel mimarisini ve veri akışını göstermektedir:

```mermaid
graph TB
    subgraph Client["Frontend - Astro SSR"]
        A[Login ve Register] --> B[Admin Paneli]
        A --> C[Aday Paneli]
        B --> D[CV Yukleme]
        B --> E[Semantik Arama]
        B --> F[Raporlar]
        B --> G[Kullanici Yonetimi]
        C --> H[Profilim ve CVlerim]
    end
    
    subgraph Server["Backend - Express.js"]
        I[REST API Routes] --> J[JWT Auth Middleware]
        J --> K[CV Route]
        J --> L[Search Route]
        J --> M[Admin Route]
        J --> N[Auth Route]
    end
    
    subgraph Processing["Asenkron Isleme"]
        O[BullMQ Queue] --> P[Worker Pool x4]
        P --> Q[PDF Text Extraction]
        Q --> R[3 Katmanli Chunking]
        R --> S[OpenAI Embedding]
        S --> T[pgvector Kayit]
    end
    
    subgraph Data["Veri Katmani"]
        U[(PostgreSQL + pgvector)]
        V[(Redis)]
        W[(Supabase Storage)]
    end
    
    subgraph AIServices["AI Servisleri"]
        X[GPT-4o-mini SWOT Analiz]
        Y[GPT-4o-mini Reranking]
        Z[text-embedding-3-small]
        AA[Query Intent Parser]
    end
    
    D -->|HTTP POST| K
    K -->|Job Ekle| O
    P -->|Socket.io| D
    E -->|Dogal Dil Sorgusu| L
    L --> AA
    L --> Z
    L -->|Cosine Similarity| U
    L --> Y
    K --> X
    O --> V
    S --> Z
    T --> U
    K --> W
```

### Mimari Tasarım Kararları

| Karar | Gerekçesi |
|:------|:----------|
| **Astro (SSR)** | Sayfa tabanlı routing, hızlı ilk yükleme, island architecture ile gerektiğinde interaktivite |
| **Express.js** | Hafif, esnek, geniş middleware ekosistemi, TypeScript uyumluluğu |
| **Prisma 7** | Type-safe sorgular, otomatik migration, PostgreSQL + pgvector desteği |
| **BullMQ + Redis** | Ana thread'i bloke etmeden ağır CV işleme, otomatik retry, ölçeklenebilirlik |
| **pgvector HNSW** | Yüksek boyutlu vektörlerde hızlı yakın komşu araması, PostgreSQL ile entegre |
| **Clean Architecture** | Domain, infrastructure ve application katmanlarının ayrılması, test edilebilirlik |

<br/>

<div align="center">

## Temel Özellikler

</div>

### Kimlik Doğrulama ve Yetkilendirme
- JWT tabanlı oturum yönetimi (Access Token + HTTP-Only Cookie)
- Rol tabanlı erişim kontrolü (ADMIN / CANDIDATE)
- bcrypt ile şifre hashleme
- Şifremi Unuttum akışı (SMS doğrulama kodu)
- Admin middleware ile yöneticiye özel route koruması

### CV Yükleme ve İşleme
- Tekli ve toplu (bulk) CV yükleme desteği
- Layout-aware PDF metin çıkarma (çok sütunlu CV desteği)
- Dosya hash kontrolü (SHA-256) ile mükerrer yükleme önleme
- Supabase Storage üzerinde güvenli dosya depolama
- Gerçek zamanlı işleme durumu (Socket.io ile canlı progress)

### 3 Katmanlı Akıllı CV Bölümleme (Chunking Pipeline)

Bu sistem, farklı formatlardaki CV'lerin (tek sütunlu, çok sütunlu, Canva şablonları) doğru şekilde bölümlenebilmesi için 3 katmanlı bir pipeline kullanır:

**Katman 1: Kural Tabanlı Bölümleme**
- Türkçe ve İngilizce başlık eşleştirme (HeadingMatcher)
- Section taxonomy ile bölüm sınıflandırma
- Güven skoru hesabı (confidence score)
- Alt bölümleme (SubChunker) ile uzun metinlerin parçalanması

**Katman 2: AI Düzeltme**
- GPT ile belirsiz bölümlerin doğru kategoriye atanması
- Karışık bölüm içeriklerinin temizlenmesi
- OpenAiSectionSegmenter ile akıllı yeniden sınıflandırma

**Katman 3: Kalite İzleme ve Trace Log**
- Yapılan tüm düzeltmelerin izlenebilir log formatında kaydı
- ChunkQualityService ile kalite metrikleri
- Düzeltme açıklamaları ve değişim geçmişi

### Semantik Aday Arama
- Doğal dilde arama (örneğin: "React bilen, İngilizce konuşan 3 yıl deneyimli frontend geliştirici")
- OpenAI text-embedding-3-small ile 1536 boyutlu vektör üretimi
- pgvector HNSW indeksi ile cosine similarity araması
- Sert kriter ayrıştırma (Hard Requirement Parsing): GPT ile arama niyeti analizi

### Hibrit Sıralama (Reranking)

| Bileşen | Ağırlık | Açıklama |
|:--------|:-------:|:---------|
| **Vektör Skoru** | %40 | pgvector cosine similarity sonucu |
| **GPT Skoru** | %60 | GPT-4o-mini aday uygunluk değerlendirmesi (0-100) |
| **Final Skor** | %100 | (Vektör x 0.40) + (GPT x 0.60) |

Her aday için Türkçe eşleştirme açıklaması üretilir ve API token kullanımı USD cinsinden takip edilir.

### AI Destekli CV Analizi (SWOT)
- ATS uyumluluk skoru (0-100)
- Pozisyon ve rol tespiti
- Teknik yetenek çıkarımı
- Güçlü yönler ve eksik yönler analizi
- Kariyer tavsiyeleri ve mülakat sorusu önerileri
- Prompt Injection Guard ile güvenlik koruması

### Yönetici Paneli
- Dashboard istatistikleri (toplam CV, aday, analiz sayıları)
- Kullanıcı yönetimi (listeleme, filtreleme, sayfalama)
- Aday profil detay sayfası (sekmeli CV okuyucu + SWOT paneli)
- Aday karşılaştırma modülü (yan yana değerlendirme)
- Raporlama sayfası (grafikler, CSV dışa aktarım)
- Arama geçmişi loglama

### Aday Paneli
- Kişisel profil ve CV yönetimi
- Analiz sonuçlarını görüntüleme
- CV silme ve yeniden analiz tetikleme
- Hesap ayarları (profil düzenleme, şifre değiştirme)

<br/>

<div align="center">

## RAG Pipeline Detayları

</div>

Projede kullanılan RAG (Retrieval-Augmented Generation) pipeline'ı aşağıdaki adımlardan oluşur:

```mermaid
graph TD
    A[Kullanici CV Yukler] --> B[Multer ve Supabase Storage]
    B --> C[PDF Text Extraction ve Dil Algilama]
    C --> D[Dokuman Hash Hesabi SHA-256]
    D --> E{Veritabaninda Ayni Hash Var mi}
    E -->|Evet - Cache Hit| F[Mevcut Embeddinglari Kopyala]
    E -->|Hayir - Cache Miss| G[Metni Bolumlere Ayir]
    G --> H{Her Chunk Icin Text Cache Var mi}
    H -->|Evet| I[Mevcut Vektoru Kopyala]
    H -->|Hayir| J[OpenAI text-embedding-3-small]
    J --> K[Vektoru pgvector a Kaydet]
    F --> L[Islem Tamamlandi]
    I --> K
    K --> L
    L --> M[HNSW Endeksli Vektorel Arama]
```

### Embedding Teknik Detayları

| Parametre | Değer |
|:----------|:------|
| **AI Modeli** | OpenAI text-embedding-3-small |
| **Vektör Boyutu** | 1536 boyut |
| **Benzerlik Metriği** | Cosine Similarity |
| **İndeks Tipi** | HNSW (Hierarchical Navigable Small World) |
| **Maliyet Takibi** | Her API çağrısı api_calls tablosuna token ve USD olarak kaydedilir |
| **Hata Politikası** | Exponential Backoff ile 4 deneme, 30 saniye timeout |
| **Cache Stratejisi** | Document-level (SHA-256 hash) ve Chunk-level (metin bazlı) çift katmanlı cache |

### RAG vs Geleneksel Arama Karşılaştırması

| Özellik | Geleneksel Anahtar Kelime Araması | Beacon RAG Araması |
|:--------|:----------------------------------|:-------------------|
| Arama Yöntemi | Tam metin eşleştirme (LIKE, ILIKE) | Vektörel benzerlik (cosine similarity) |
| Anlam Anlama | Yok, sadece kelime eşleştirme | Var, semantik anlam yakalama |
| Sıralama | Basit frekans tabanlı | Hibrit (vektör %40 + GPT %60) |
| Kriter Ayrıştırma | Manuel filtre | GPT ile otomatik niyet analizi |
| Çok Dilli Destek | Sınırlı | Embedding modeli ile doğal destek |

<br/>

<div align="center">

## Veritabanı Şeması

</div>

Projede 8 tablo bulunmaktadır. Aşağıda tablolar ve ilişkileri gösterilmektedir:

```mermaid
erDiagram
    User ||--o{ CV : yukler
    User ||--o{ SearchLog : arar
    CV ||--o{ CVAnalysis : analiz_edilir
    CV ||--o{ CVChunk : bolumlenir
    CVChunk ||--o{ CVEmbedding : vektorlestirilir

    User {
        uuid id PK
        string email UK
        string phone UK
        string passwordHash
        enum role
        string name
        string avatarUrl
        string resetCode
        datetime resetCodeExpires
        datetime createdAt
    }

    CV {
        uuid id PK
        uuid userId FK
        string fileName
        string fileUrl
        string rawText
        string hash
        json metadata
        string extractionMethod
        datetime createdAt
        datetime updatedAt
    }

    CVAnalysis {
        uuid id PK
        uuid cvId FK
        enum status
        int atsScore
        json skills
        json strengths
        json weaknesses
        json suggestions
        json interviewQuestions
        datetime createdAt
    }

    CVChunk {
        uuid id PK
        uuid cvId FK
        string chunkText
        int chunkIndex
        json metadata
        datetime createdAt
    }

    CVEmbedding {
        uuid id PK
        uuid chunkId FK
        vector_1536 embedding
        string model
        json metadata
        datetime createdAt
    }

    APICall {
        uuid id PK
        string model
        int tokensIn
        int tokensOut
        decimal costUsd
        string endpoint
        string status
        datetime createdAt
    }

    CostLog {
        uuid id PK
        uuid cvId
        uuid analysisId
        string operation
        int durationMs
        int tokensUsed
        decimal estimatedCostUsd
        string status
        json metadata
        datetime createdAt
    }

    SearchLog {
        uuid id PK
        uuid userId FK
        string query
        datetime createdAt
    }
```

### Tablo Açıklamaları

| Tablo | Kayıt Sayısı Tipi | Açıklama |
|:------|:------------------|:---------|
| **User** | Az (yüzler) | Kullanıcı hesapları, roller ve profil bilgileri |
| **CV** | Orta (binler) | Yüklenen CV dosya kayıtları, hash ve metadata |
| **CVAnalysis** | Orta (binler) | GPT SWOT analiz sonuçları ve ATS skorları |
| **CVChunk** | Çok (on binler) | CV metinlerinin bölümlendirilmiş parçaları |
| **CVEmbedding** | Çok (on binler) | 1536 boyutlu vektör embedding'leri |
| **APICall** | Çok (on binler) | OpenAI API çağrı kayıtları ve maliyet takibi |
| **CostLog** | Çok (on binler) | İşlem süresi, token kullanımı ve USD maliyet kayıtları |
| **SearchLog** | Orta (binler) | Kullanıcı arama geçmişi |

<br/>

<div align="center">

## Worker Pool Mimarisi

</div>

CV yüklemelerinde ana HTTP sunucusunu bloke etmemek için **BullMQ + Redis** tabanlı asenkron bir Worker Pool mimarisi uygulanmıştır:

```mermaid
graph TD
    A[Kullanici CV Yukler - HTTP POST] --> B[Express Main Thread]
    B --> C[Veritabaninda CV Kaydi Olustur]
    B --> D[cvQueue.add - Redis e Ekle]
    B --> E[Kullaniciya Aninda 200 OK Don]
    
    subgraph WorkerPool["Worker Pool - Concurrency 4"]
        F[Worker 1]
        G[Worker 2]
        H[Worker 3]
        I[Worker 4]
    end
    
    D -->|Kuyruktan Job Cek| F
    D -->|Kuyruktan Job Cek| G
    D -->|Kuyruktan Job Cek| H
    D -->|Kuyruktan Job Cek| I
    
    F --> J[ProcessCvPipeline]
    G --> J
    H --> J
    I --> J
    
    J --> K[Chunking + Embedding + AI Analiz]
    K --> L[DB Kayit ve Socket.io Bildirim]
```

### Worker Pool Parametreleri

| Parametre | Değer | Açıklama |
|:----------|:------|:---------|
| **Eşzamanlı İşçi Sayısı** | 4 | Sabit concurrency, 5. CV kuyrukta bekler |
| **Retry Sayısı** | 3 | Hata durumunda otomatik tekrar deneme |
| **Backoff Stratejisi** | Exponential | 2s, 4s, 8s artan bekleme süresi |
| **Kuyruk Deposu** | Redis 7 Alpine | Docker Container içerisinde |
| **İzleme** | Socket.io | Gerçek zamanlı progress bildirimi |
| **Timeout** | 30 saniye | Chunk başına maksimum işleme süresi |

### Neden Worker Pool?

Senkron işlemde CV yüklendikten sonra kullanıcı sayfada dakikalarca beklemek zorunda kalır (PDF parse + chunking + embedding + AI analiz). Worker Pool mimarisi ile:

1. Kullanıcıya anında yanıt dönülür (200 OK).
2. Ağır işlem arka planda asenkron olarak başlar.
3. İlerleme durumu Socket.io ile canlı olarak kullanıcıya iletilir.
4. Birden fazla CV aynı anda paralel işlenir.

<br/>

<div align="center">

## Arama ve Sıralama Motoru

</div>

Arama motoru 3 aşamalı bir pipeline kullanır:

```mermaid
graph LR
    A[Dogal Dil Sorgusu] --> B[GPT-4o-mini Query Parser]
    B --> C[Hard Requirements + Soft Context]
    C --> D[Sorgu Vektoru Uretimi]
    D --> E[pgvector HNSW Aramasi]
    E --> F[Ilk N Aday]
    F --> G[GPT-4o-mini Reranking]
    G --> H[Hibrit Skor Hesabi]
    H --> I[Sirali Sonuclar]
```

**Aşama 1: Niyet Ayrıştırma**

Kullanıcının doğal dildeki sorgusu GPT-4o-mini'ye gönderilir. Model, sorgudaki zorunlu kriterleri (sertifika, dil, deneyim yılı, konum vb.) ve yumuşak bağlamı JSON formatında ayrıştırır. Zod ile doğrulama yapılır.

**Aşama 2: Vektörel Arama**

Sorgu metni text-embedding-3-small ile 1536 boyutlu vektöre dönüştürülür. pgvector HNSW indeksi üzerinde cosine similarity ile en yakın chunk'lar bulunur ve ilgili adaylara gruplandırılır.

**Aşama 3: Hibrit Reranking**

İlk aday listesi GPT-4o-mini'ye gönderilir, her aday 0-100 arasında puanlanır. Türkçe eşleştirme açıklaması üretilir. Final skor vektör skoru (%40) ve GPT skoru (%60) ile hesaplanır.

<br/>

<div align="center">

## Güvenlik Mimarisi

</div>

### Uygulama Katmanı Güvenlik Denetimi

Projenin tek gerçek güvenlik katmanı Express middleware + Prisma WHERE userId filtresidir. Aşağıda tüm route'ların denetim sonuçları listelenmiştir:

| Route | Metot | Tablo | Kullanıcı Filtresi | Sonuç |
|:------|:------|:------|:--------------------|:-----:|
| `POST /api/cv/upload` | `cV.create` | cvs | `userId: req.user.id` | BAŞARILI |
| `GET /api/cv/` | `cV.findMany` | cvs | `WHERE userId = req.user.id` | BAŞARILI |
| `GET /api/cv/:id` | `cV.findFirst` | cvs + chunks | `WHERE id AND userId` | BAŞARILI |
| `DELETE /api/cv/:id` | `cV.delete` | cvs | Sahiplik doğrulaması | BAŞARILI |
| `GET /api/cv/search` | `searchSimilarChunks` | cv_embeddings | `JOIN cvs WHERE userId` | BAŞARILI |
| `POST /api/cv/:id/retry` | `cV.findUnique` | cvs | ADMIN rolü zorunlu | BAŞARILI |
| `GET /api/admin/*` | çeşitli | cvs | Admin middleware | BAŞARILI |

### Güvenlik Katmanları

| Katman | Teknoloji | Açıklama |
|:-------|:----------|:---------|
| **Kimlik Doğrulama** | JWT + HTTP-Only Cookie | Her API isteğinde token doğrulama |
| **Yetkilendirme** | Rol Bazlı (RBAC) | ADMIN ve CANDIDATE erişim ayrımı |
| **Veri İzolasyonu** | Prisma WHERE filtresi | Kullanıcı sadece kendi verisine erişir |
| **AI Güvenlik** | Prompt Injection Guard | Zararlı komut tespiti ve engelleme |
| **Dosya Bütünlüğü** | SHA-256 Hash | Mükerrer yükleme önleme |
| **Giriş Doğrulama** | Zod Runtime Validation | Tüm API parametrelerinde şema kontrolü |
| **Şifre Güvenliği** | bcrypt | Tek yönlü şifre hashleme |

<br/>

<div align="center">

## Proje Yapısı

</div>

```text
astro-project/
├── public/                            # Statik dosyalar (logo, görseller)
├── src/                               # Frontend (Astro)
│   ├── components/ui/                 # Yeniden kullanılabilir UI bileşenleri
│   │   ├── Badge.astro                #   Rozet bileşeni
│   │   ├── Button.astro               #   Buton bileşeni
│   │   ├── Card.astro                 #   Kart bileşeni
│   │   └── Input.astro                #   Giriş alanı bileşeni
│   ├── layouts/                       # Admin ve Aday layout şablonları
│   ├── pages/
│   │   ├── admin/                     # Yönetici sayfaları
│   │   │   ├── dashboard.astro        #   Dashboard ve istatistikler
│   │   │   ├── upload.astro           #   CV yükleme (tekli + toplu)
│   │   │   ├── search.astro           #   Semantik aday arama
│   │   │   ├── users.astro            #   Kullanıcı yönetimi
│   │   │   ├── reports.astro          #   Raporlar ve grafikler
│   │   │   ├── compare.astro          #   Aday karşılaştırma
│   │   │   ├── candidate-profile.astro#   Aday detay profili
│   │   │   └── settings.astro         #   Yönetici ayarları
│   │   ├── candidate/                 # Aday sayfaları
│   │   │   ├── profile.astro          #   Aday profili ve CV'ler
│   │   │   ├── analyses.astro         #   Analiz sonuçları
│   │   │   └── settings.astro         #   Hesap ayarları
│   │   ├── index.astro                # Landing page
│   │   ├── login.astro                # Giriş sayfası
│   │   ├── register.astro             # Kayıt sayfası
│   │   └── forgot-password.astro      # Şifremi unuttum
│   └── scripts/                       # Frontend TypeScript modülleri
│       ├── admin/                     #   Admin sayfa script'leri
│       ├── candidate/                 #   Aday sayfa script'leri
│       └── shared/                    #   Ortak modüller (toast, stepper, uploader)
│
├── server/                            # Backend (Express.js)
│   ├── prisma/
│   │   └── schema.prisma              # Veritabanı modelleri (8 tablo)
│   └── src/
│       ├── domain/                    # Domain katmanı (Clean Architecture)
│       │   ├── cv/                    #   CV işleme domain nesneleri
│       │   │   ├── CvTextPreprocessor.ts  # Metin ön işleme
│       │   │   ├── HeadingMatcher.ts      # Başlık eşleştirme
│       │   │   ├── LocalRuleBasedChunker.ts # Kural tabanlı bölümleme
│       │   │   ├── SectionTaxonomy.ts     # Bölüm sınıflandırma
│       │   │   └── SubChunker.ts          # Alt bölümleme
│       │   └── search/                #   Arama domain nesneleri
│       │       └── HardRequirement.ts     # Sert kriter tanımları
│       ├── infrastructure/            # Altyapı katmanı
│       │   ├── ai/                    #   AI servisleri
│       │   │   ├── OpenAiCvAnalyzer.ts    # GPT SWOT analiz motoru
│       │   │   ├── OpenAIQueryParser.ts   # Arama niyeti ayrıştırıcı
│       │   │   ├── OpenAiSectionSegmenter.ts # AI bölüm düzeltme
│       │   │   ├── LocalRuleAnalyzer.ts   # Yerel kural analizi (fallback)
│       │   │   └── PromptInjectionGuard.ts # Güvenlik koruması
│       │   ├── pdf/                   #   PDF işleme
│       │   │   ├── PdfExtractor.ts        # Layout-aware metin çıkarma
│       │   │   └── PdfTextExtractor.ts    # Metin çıkarma yardımcıları
│       │   ├── queue/                 #   Kuyruk altyapısı
│       │   │   ├── cvQueue.ts             # BullMQ kuyruk tanımı
│       │   │   ├── cvWorker.ts            # Worker pool işçisi
│       │   │   └── redisClient.ts         # Redis bağlantısı
│       │   ├── security/              #   Güvenlik
│       │   │   ├── JwtService.ts          # JWT token üretimi ve doğrulama
│       │   │   └── PasswordHasher.ts      # bcrypt şifre hashleme
│       │   └── validation/            #   Doğrulama
│       │       └── SearchSchemas.ts       # Zod şemaları
│       ├── middleware/                # Express middleware'leri
│       │   └── auth.ts                #   JWT ve rol doğrulama
│       ├── routes/                    # API route tanımları
│       │   ├── auth.ts                #   Kimlik doğrulama
│       │   ├── cv.ts                  #   CV işlemleri
│       │   ├── search.ts              #   Semantik arama
│       │   └── admin.ts               #   Yönetici işlemleri
│       ├── services/                  # İş mantığı servisleri
│       │   ├── ChunkQualityService.ts #   3 katmanlı parçalama kalite servisi
│       │   ├── EmbeddingService.ts    #   OpenAI vektör üretim servisi
│       │   └── RankingService.ts      #   Hibrit sıralama ve reranking servisi
│       └── index.ts                   # Sunucu giriş noktası
│
├── docker-compose.yml                 # Redis konteyner yapılandırması
├── package.json                       # Root proje bağımlılıkları
└── tsconfig.json                      # TypeScript yapılandırması
```

<br/>

<div align="center">

## Kurulum ve Çalıştırma

</div>

### Gereksinimler

| Araç | Minimum Versiyon | Not |
|:-----|:-----------------|:----|
| **Node.js** | 22.12.0 ve üzeri | package.json engines ile zorunlu tutulur |
| **Docker** | 20.x ve üzeri | Redis konteyneri için gerekli |
| **PostgreSQL** | 15+ | pgvector eklentili (Supabase önerilir) |
| **OpenAI API Key** | - | GPT-4o-mini ve embedding modeli için |

### 1. Projeyi Klonlama

```bash
git clone https://github.com/omerabali/STAJ22001.git
cd STAJ22001/astro-project
```

### 2. Ortam Değişkenleri

Root dizinde `.env` dosyası oluşturun:

```env
PUBLIC_SUPABASE_URL=https://PROJE_ID.supabase.co
PUBLIC_SUPABASE_ANON_KEY=ANON_KEY_BURAYA
```

Server dizininde `server/.env` dosyası oluşturun:

```env
PORT=5000
DATABASE_URL="postgresql://postgres.ID:SIFRE@HOST:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ID:SIFRE@HOST:5432/postgres"
JWT_SECRET=JWT_GIZLI_ANAHTAR
OPENAI_API_KEY=OPENAI_API_ANAHTARI
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Bağımlılık Kurulumu

```bash
# Root ve server bağımlılıklarını yükle
npm install
cd server && npm install && cd ..

# Prisma client üret ve veritabanını hazırla
cd server
npx prisma generate
npx prisma db push
cd ..
```

### 4. Redis Başlatma (Docker)

```bash
docker compose up -d
```

### 5. Projeyi Çalıştırma

```bash
# Frontend (Astro) + Backend (Express) eşzamanlı çalıştırma
npm run dev:all
```

| Servis | Adres |
|:-------|:------|
| **Frontend (Astro)** | http://localhost:4321 |
| **Backend (Express)** | http://localhost:5000 |

<br/>

<div align="center">

## API Endpoint Referansı

</div>

### Kimlik Doğrulama Endpoint'leri

| Metot | Endpoint | Açıklama | Yetki |
|:------|:---------|:---------|:------|
| POST | `/api/auth/register` | Yeni kullanıcı kaydı | Herkese açık |
| POST | `/api/auth/login` | Giriş ve JWT token üretimi | Herkese açık |
| POST | `/api/auth/logout` | Oturum sonlandırma | Oturum gerekli |
| GET | `/api/auth/me` | Oturum bilgisi sorgulama | Oturum gerekli |
| POST | `/api/auth/forgot-password` | Şifre sıfırlama kodu gönderimi | Herkese açık |
| POST | `/api/auth/reset-password` | Şifre sıfırlama | Herkese açık |

### CV İşlemleri Endpoint'leri

| Metot | Endpoint | Açıklama | Yetki |
|:------|:---------|:---------|:------|
| POST | `/api/cv/upload` | CV yükleme (tekli ve toplu) | Oturum gerekli |
| GET | `/api/cv/` | Kullanıcının CV listesi | Oturum gerekli |
| GET | `/api/cv/:id` | CV detayı ve chunk'ları | Oturum gerekli (sahiplik) |
| DELETE | `/api/cv/:id` | CV silme | Oturum gerekli (sahiplik) |
| POST | `/api/cv/:id/retry` | Başarısız CV'yi yeniden işleme | Sadece ADMIN |

### Arama Endpoint'leri

| Metot | Endpoint | Açıklama | Yetki |
|:------|:---------|:---------|:------|
| GET | `/api/search` | Semantik aday arama (doğal dil sorgusu) | Oturum gerekli |

### Yönetici Endpoint'leri

| Metot | Endpoint | Açıklama | Yetki |
|:------|:---------|:---------|:------|
| GET | `/api/admin/stats` | Dashboard istatistikleri | Sadece ADMIN |
| GET | `/api/admin/users` | Kullanıcı listesi | Sadece ADMIN |
| GET | `/api/admin/candidates/:id` | Aday detay profili | Sadece ADMIN |

<br/>

<div align="center">

## Performans Metrikleri

</div>

### Worker Pool Benchmark Sonuçları

5 gerçek CV ile yapılan karşılaştırmalı benchmark testi:

| Metrik | Sıralı İşleme | Worker Pool (Paralel) | İyileşme |
|:-------|:-------------:|:---------------------:|:--------:|
| **Toplam Süre** | 190.7 saniye | 61.8 saniye | **%67.6 azalma** |
| **Ortalama CV Başına** | 38.1 saniye | 12.4 saniye | **%67.5 azalma** |
| **Eşzamanlılık** | 1 | 4 | **4x paralel** |

### Embedding Cache Performansı

| Senaryo | Açıklama | API Çağrısı |
|:--------|:---------|:------------|
| **Document-Level Cache Hit** | Aynı hash'e sahip CV tekrar yüklendiğinde embedding kopyalanır | Yapılmaz |
| **Chunk-Level Cache Hit** | Aynı metin parçası farklı CV'lerde geçtiğinde mevcut vektör kullanılır | Yapılmaz |
| **Cache Miss** | Yeni metin için OpenAI API çağrısı yapılır | Yapılır, maliyet kaydedilir |

### API Maliyet Takibi

Sistemde yapılan her OpenAI API çağrısı otomatik olarak kaydedilir:

| İşlem | Model | Maliyet Hesaplama |
|:------|:------|:------------------|
| CV Embedding | text-embedding-3-small | tokensIn x $0.00000002 |
| CV SWOT Analizi | gpt-4o-mini | Standart OpenAI tarifesi |
| Arama Niyeti Ayrıştırma | gpt-4o-mini | Standart OpenAI tarifesi |
| Aday Reranking | gpt-4o-mini | Standart OpenAI tarifesi |

<br/>

<div align="center">

## Kullanıcı Senaryoları

</div>

### Senaryo 1: Admin - CV Yükleme ve Aday Arama

Aşağıdaki diyagram bir yöneticinin platforma CV yükleyip, semantik arama yaparak en uygun adayı bulması sürecini göstermektedir:

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Astro Frontend
    participant API as Express Backend
    participant Queue as BullMQ Queue
    participant Worker as Worker Pool
    participant AI as OpenAI API
    participant DB as PostgreSQL + pgvector

    Note over Admin,DB: 1. CV Yukleme Sureci
    Admin->>UI: CV dosyasini secer ve yukler
    UI->>API: POST /api/cv/upload (multipart form)
    API->>DB: CV kaydi olustur (status: PENDING)
    API->>Queue: cvQueue.add(jobData)
    API-->>UI: 200 OK (aninda yanit)
    UI-->>Admin: "CV yuklendi, isleniyor..." bildirimi

    Note over Worker,DB: 2. Arka Plan Isleme
    Queue->>Worker: Job'i cek ve isle
    Worker->>Worker: PDF Text Extraction
    Worker->>Worker: 3 Katmanli Chunking
    Worker->>AI: text-embedding-3-small (vektor uretimi)
    AI-->>Worker: 1536 boyutlu vektorler
    Worker->>DB: Chunk + Embedding kaydet
    Worker->>AI: GPT-4o-mini (SWOT Analiz)
    AI-->>Worker: ATS skoru, yetenekler, guclu/eksik yonler
    Worker->>DB: CVAnalysis kaydet (status: COMPLETED)
    Worker-->>UI: Socket.io "CV islendi" bildirimi
    UI-->>Admin: Gercek zamanli tamamlandi bildirimi

    Note over Admin,DB: 3. Semantik Aday Arama
    Admin->>UI: "React bilen 3 yil deneyimli developer" yazar
    UI->>API: GET /api/search?q=...
    API->>AI: GPT-4o-mini (Query Intent Parse)
    AI-->>API: hardRequirements + softContext
    API->>AI: text-embedding-3-small (sorgu vektoru)
    AI-->>API: 1536 boyutlu sorgu vektoru
    API->>DB: pgvector HNSW cosine similarity aramasi
    DB-->>API: En yakin N aday
    API->>AI: GPT-4o-mini (Reranking)
    AI-->>API: Her aday icin 0-100 puan + aciklama
    API-->>UI: Hibrit skorla siralanmis aday listesi
    UI-->>Admin: Sonuclari gosterir (skor, aciklama, profil)

    Note over Admin,DB: 4. Aday Karsilastirma
    Admin->>UI: 2 adayi karsilastirma icin secer
    UI->>API: GET /api/admin/candidates/:id (x2)
    API->>DB: Aday profil + analiz verisi
    DB-->>API: Profil, SWOT, yetenekler
    API-->>UI: Karsilastirma verileri
    UI-->>Admin: Yan yana SWOT ve yetenek karsilastirmasi
```

### Senaryo 2: Admin - Kullanıcı Yönetimi ve Raporlama

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Astro Frontend
    participant API as Express Backend
    participant DB as PostgreSQL

    Note over Admin,DB: 1. Dashboard Istatistikleri
    Admin->>UI: Dashboard sayfasini acar
    UI->>API: GET /api/admin/stats
    API->>DB: Toplam CV, kullanici, analiz sayilari
    DB-->>API: Istatistik verileri
    API-->>UI: JSON response
    UI-->>Admin: Kartlar ve grafiklerle istatistikler

    Note over Admin,DB: 2. Kullanici Yonetimi
    Admin->>UI: Kullanicilar sayfasina gider
    UI->>API: GET /api/admin/users?page=1
    API->>DB: Sayfalanmis kullanici listesi
    DB-->>API: Kullanici verileri
    API-->>UI: Kullanici listesi
    UI-->>Admin: Filtrelenebilir kullanici tablosu

    Note over Admin,DB: 3. Raporlama ve CSV Aktarim
    Admin->>UI: Raporlar sayfasini acar
    UI->>API: GET /api/admin/stats (detayli)
    API->>DB: Analiz dagilimi, ATS skor ortalamasi
    DB-->>API: Rapor verileri
    API-->>UI: Grafik verileri
    UI-->>Admin: Chart.js grafikleri ve CSV indirme butonu
    Admin->>UI: CSV Indir butonuna tiklar
    UI-->>Admin: Tum analiz verileri CSV dosyasi olarak indirilir
```

### Senaryo 3: Aday - CV Yükleme ve Analiz Görüntüleme

```mermaid
sequenceDiagram
    actor Aday
    participant UI as Astro Frontend
    participant API as Express Backend
    participant Queue as BullMQ Queue
    participant Worker as Worker Pool
    participant AI as OpenAI API
    participant DB as PostgreSQL

    Note over Aday,DB: 1. Kayit ve Giris
    Aday->>UI: Kayit formunu doldurur
    UI->>API: POST /api/auth/register
    API->>DB: Yeni kullanici olustur (role: CANDIDATE)
    API-->>UI: JWT token
    UI-->>Aday: Profil sayfasina yonlendirme

    Note over Aday,DB: 2. CV Yukleme
    Aday->>UI: PDF CV dosyasini secer
    UI->>API: POST /api/cv/upload
    API->>DB: CV kaydi olustur
    API->>Queue: Isleme kuyruguna ekle
    API-->>UI: 200 OK
    UI-->>Aday: "CV yuklendi" toast bildirimi

    Note over Worker,DB: 3. Arka Plan Isleme (Otomatik)
    Queue->>Worker: Job'i isle
    Worker->>Worker: PDF Parse + Chunking
    Worker->>AI: Embedding + SWOT Analiz
    AI-->>Worker: Sonuclar
    Worker->>DB: Kaydet
    Worker-->>UI: Socket.io bildirim
    UI-->>Aday: "Analiz tamamlandi!" canli bildirim

    Note over Aday,DB: 4. Analiz Sonuclarini Goruntuleme
    Aday->>UI: Analizlerim sayfasina gider
    UI->>API: GET /api/cv/
    API->>DB: Adayin CV ve analiz listesi
    DB-->>API: CV'ler ve analizler
    API-->>UI: CV listesi + analiz sonuclari
    UI-->>Aday: ATS skoru, yetenekler, SWOT paneli

    Note over Aday,DB: 5. CV Yeniden Analiz
    Aday->>UI: "Yeniden Analiz Et" butonuna tiklar
    UI->>API: POST /api/cv/:id/retry
    API->>Queue: Yeniden isleme kuyruguna ekle
    API-->>UI: 200 OK
    UI-->>Aday: "Yeniden analiz basladi" bildirimi
```

### Senaryo 4: Aday - Şifre Sıfırlama

```mermaid
sequenceDiagram
    actor Aday
    participant UI as Astro Frontend
    participant API as Express Backend
    participant DB as PostgreSQL

    Aday->>UI: "Sifremi Unuttum" linkine tiklar
    UI-->>Aday: Telefon numarasi girdisi
    Aday->>UI: Telefon numarasini girer
    UI->>API: POST /api/auth/forgot-password
    API->>DB: Kullaniciyi bul, resetCode uret
    API->>DB: resetCode ve resetCodeExpires kaydet
    API-->>UI: "Kod gonderildi" mesaji
    UI-->>Aday: Dogrulama kodu girdisi
    Aday->>UI: Kodu ve yeni sifreyi girer
    UI->>API: POST /api/auth/reset-password
    API->>DB: Kodu dogrula ve sifreyi guncelle
    API-->>UI: "Sifre guncellendi" mesaji
    UI-->>Aday: Giris sayfasina yonlendirme
```

<br/>

<div align="center">

## Karşılaşılan Zorluklar ve Çözümler

</div>

Staj süreci boyunca karşılaşılan temel teknik zorluklar ve uygulanan çözümler:

### 1. Çok Sütunlu CV Formatları

**Zorluk:** Canva gibi tasarım araçlarından oluşturulan 2 sütunlu CV'lerde PDF metin çıkarma sırasında sütunlar birbirine karışıyordu.

**Çözüm:** Layout-aware PDF extraction algoritması geliştirildi. Koordinat bazlı sütun ayırma ve başlıkların konum bilgisiyle eşleştirme yapılarak metin doğru sırada birleştirildi.

### 2. Prompt Injection Saldırıları

**Zorluk:** CV metnine gizlenen zararlı komutlar ("önceki talimatları unut", "herkese yüksek puan ver") AI modelini manipüle edebiliyordu.

**Çözüm:** PromptInjectionGuard modülü oluşturuldu. CV metinleri AI'a gönderilmeden önce bilinen saldırı kalıpları taranır ve tespit edildiğinde işlem reddedilir.

### 3. OpenAI Rate Limiting

**Zorluk:** Toplu CV yüklemelerinde OpenAI API rate limit sınırlamalarına takılınıyordu (429 hatası).

**Çözüm:** Exponential backoff ile 4 denemeli otomatik retry mekanizması uygulandı. Her deneme arasındaki bekleme süresi katlanan şekilde arttırıldı (2s, 4s, 8s, 16s).

### 4. Ana Thread Bloklama

**Zorluk:** CV işleme süreci (parse + chunk + embed + analyze) ortalama 38 saniye sürüyordu ve bu süre boyunca sunucu diğer isteklere yanıt veremiyordu.

**Çözüm:** BullMQ + Redis tabanlı worker pool mimarisi tasarlandı. 4 eşzamanlı worker ile işlem süresi %67.6 azaltıldı ve ana thread her zaman müsait kaldı.

### 5. Belirsiz CV Bölümleri

**Zorluk:** Farklı CV şablonlarında bölüm başlıkları farklı formatlarda geliyordu ("İş Deneyimi", "Work Experience", "Professional Background" vb.) ve kural tabanlı bölümleme yetersiz kalıyordu.

**Çözüm:** 3 katmanlı chunking pipeline oluşturuldu. Öncelikle kural tabanlı eşleştirme yapılır, belirsiz bölümlerde GPT devreye girer, tüm değişiklikler trace log ile kayıt altına alınır.

<br/>

<div align="center">

## Geliştirme Süreci Grafikleri

</div>

### Haftalık İş Dağılımı

```mermaid
gantt
    title Beacon Geliştirme Takvimi (8 Hafta)
    dateFormat YYYY-MM-DD
    axisFormat %d %b

    section Altyapi
    Proje Kurulumu ve Arastirma           :done, w1, 2025-06-16, 5d
    Express + Prisma + Supabase           :done, w2, 2025-06-23, 5d

    section Frontend
    Login Register Dashboard UI           :done, w3, 2025-06-30, 5d
    CV Yukleme ve Toplu Isleme UI         :done, w4a, 2025-07-07, 5d
    Aday Profil ve Karsilastirma UI       :done, w5a, 2025-07-14, 3d
    Mobil Uyumluluk ve UI Polish          :done, w8, 2025-08-04, 5d

    section Backend
    CV Isleme Pipeline                    :done, w4b, 2025-07-07, 5d
    AI Analiz ve Semantik Arama           :done, w5b, 2025-07-14, 5d
    Clean Architecture Refaktoru          :done, w6a, 2025-07-21, 3d

    section DevOps
    Docker Redis BullMQ Kurulumu          :done, w6b, 2025-07-23, 3d
    Benchmark ve Performans Testi         :done, w7, 2025-07-28, 5d

    section Dokumantasyon
    README ve Proje Teslimi               :done, w8b, 2025-08-06, 3d
```

### Teknoloji Dağılımı

```mermaid
pie title Kod Tabani Teknoloji Dagilimi
    "TypeScript (Frontend Scripts)" : 35
    "TypeScript (Backend)" : 30
    "Astro Components" : 15
    "SQL / Prisma Schema" : 8
    "CSS / Tailwind" : 7
    "Docker / Config" : 5
```

### Özellik Kategorileri

```mermaid
pie title Ozellik Kategorileri Dagilimi
    "AI ve NLP Entegrasyonu" : 25
    "Frontend Sayfalari" : 20
    "Backend API ve Routes" : 18
    "Veritabani ve Vektorel Arama" : 15
    "Guvenlik ve Yetkilendirme" : 10
    "Worker Pool ve Kuyruk" : 7
    "DevOps ve Altyapi" : 5
```

### Backend Katman Yapısı

```mermaid
graph TB
    subgraph Presentation["Sunum Katmani (Routes)"]
        R1[auth.ts]
        R2[cv.ts]
        R3[search.ts]
        R4[admin.ts]
    end

    subgraph Application["Uygulama Katmani (Services)"]
        S1[ChunkQualityService]
        S2[EmbeddingService]
        S3[RankingService]
    end

    subgraph Domain["Domain Katmani"]
        D1[CvTextPreprocessor]
        D2[HeadingMatcher]
        D3[LocalRuleBasedChunker]
        D4[SectionTaxonomy]
        D5[SubChunker]
        D6[HardRequirement]
    end

    subgraph Infrastructure["Altyapi Katmani"]
        I1[OpenAiCvAnalyzer]
        I2[OpenAIQueryParser]
        I3[OpenAiSectionSegmenter]
        I4[PdfExtractor]
        I5[cvQueue + cvWorker]
        I6[JwtService]
        I7[PasswordHasher]
        I8[PromptInjectionGuard]
    end

    subgraph External["Dis Servisler"]
        E1[(PostgreSQL + pgvector)]
        E2[(Redis)]
        E3[OpenAI API]
        E4[(Supabase Storage)]
    end

    R1 --> S1
    R2 --> S1
    R2 --> S2
    R3 --> S3
    R3 --> S2
    R4 --> S1

    S1 --> D1
    S1 --> D2
    S1 --> D3
    S1 --> D4
    S1 --> D5
    S2 --> I1
    S3 --> I2
    S3 --> D6

    I1 --> E3
    I2 --> E3
    I3 --> E3
    I4 --> E4
    I5 --> E2
    S2 --> E1
    S1 --> E1
```

### Veri Akış Grafiği

```mermaid
graph LR
    subgraph Giris["Veri Girisi"]
        A[PDF Dosyasi]
        B[Kullanici Bilgileri]
        C[Arama Sorgusu]
    end

    subgraph Isleme["Veri Isleme"]
        D[PDF Parser]
        E[3 Katmanli Chunker]
        F[Embedding Generator]
        G[SWOT Analyzer]
        H[Query Intent Parser]
        I[Reranker]
    end

    subgraph Depolama["Veri Depolama"]
        J[(Users Tablosu)]
        K[(CVs Tablosu)]
        L[(CVChunks Tablosu)]
        M[(CVEmbeddings Tablosu)]
        N[(CVAnalysis Tablosu)]
        O[(APICall Tablosu)]
        P[(CostLog Tablosu)]
        Q[(SearchLog Tablosu)]
    end

    subgraph Cikis["Veri Cikisi"]
        R[Aday Listesi]
        S[SWOT Raporu]
        T[Dashboard Istatistikleri]
        U[CSV Rapor]
    end

    A --> D --> E --> F --> M
    E --> L
    D --> K
    B --> J
    F --> G --> N
    C --> H --> F
    M --> I --> R
    N --> S
    K --> T
    N --> U
    F --> O
    G --> O
    G --> P
```

### Sayfa Yapısı Haritası

```mermaid
graph TD
    subgraph Public["Herkese Acik Sayfalar"]
        LP[index.astro - Landing Page]
        LG[login.astro - Giris]
        RG[register.astro - Kayit]
        FP[forgot-password.astro - Sifre Sifirlama]
    end

    subgraph AdminPanel["Admin Paneli (8 Sayfa)"]
        AD[dashboard.astro - Istatistikler]
        AU[upload.astro - CV Yukleme]
        AS[search.astro - Semantik Arama]
        AUS[users.astro - Kullanici Yonetimi]
        AR[reports.astro - Raporlar]
        AC[compare.astro - Aday Karsilastirma]
        ACP[candidate-profile.astro - Aday Detay]
        AST[settings.astro - Ayarlar]
    end

    subgraph CandidatePanel["Aday Paneli (3 Sayfa)"]
        CP[profile.astro - Profil ve CVler]
        CA[analyses.astro - Analiz Sonuclari]
        CS[settings.astro - Hesap Ayarlari]
    end

    LP --> LG
    LP --> RG
    LG --> FP
    LG -->|Admin Girisi| AD
    LG -->|Aday Girisi| CP

    AD --> AU
    AD --> AS
    AD --> AUS
    AD --> AR
    AS --> ACP
    AS --> AC
    AD --> AST

    CP --> CA
    CP --> CS
```

### OpenAI API Kullanım Noktaları

Projede OpenAI API 6 farklı noktada kullanılmaktadır:

| Kullanım Noktası | Model | Tetiklenme Zamanı | Tahmini Maliyet |
|:-----------------|:------|:------------------|:----------------|
| CV Chunk Vektörleştirme | text-embedding-3-small | Her yeni chunk için | Düşük (token başına $0.00000002) |
| Arama Sorgusu Vektörleştirme | text-embedding-3-small | Her arama için | Çok düşük (tek sorgu) |
| CV SWOT Analizi | GPT-4o-mini | Her CV işleme sonrasında | Orta (tam CV metni gönderilir) |
| Arama Niyeti Ayrıştırma | GPT-4o-mini | Her arama için | Düşük (kısa sorgu metni) |
| Aday Reranking | GPT-4o-mini | Her arama sonrasında | Orta (N aday bilgisi gönderilir) |
| Bölüm Düzeltme | GPT-4o-mini | Belirsiz chunk tespitinde | Düşük (sadece gerektiğinde) |

<br/>

<div align="center">

## Geliştirici

**Ömer Abalı**

| Bilgi | Değer |
|:------|:------|
| **Staj Dönemi** | 2025, 8 Hafta (39 İş Günü) |
| **GitHub** | [@omerabali](https://github.com/omerabali) |
| **Proje Deposu** | [STAJ22001](https://github.com/omerabali/STAJ22001) |

<br/>

**Beacon**: Staj sürecinde sıfırdan tasarlanıp geliştirilen, yapay zeka destekli CV analiz ve semantik aday arama platformu.

*Bu proje bir staj çalışması olarak geliştirilmiştir.*

</div>
