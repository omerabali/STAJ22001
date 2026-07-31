# Benchmark Karşılaştırma Raporu (Worker Pool - Concurrency: 4)

Bu rapor, **5 Gerçek CV** dosyasının **Sıralı (Tek Tek)** ve **Toplu (Aynı Anda)** yüklenme performansını karşılaştırmaktadır.

---

## 📊 Özet Karşılaştırma Tablosu

| Metrik | Sıralı (Tek Tek) | Toplu (Aynı Anda) | Fark / İyileşme |
|--------|------------------|-------------------|-----------------|
| **Toplam Süre (5 CV)** | 190.69s | 61.78s | **%67.6 daha hızlı** (128.90s tasarruf) |
| **Ortalama CV Süresi** | 38.14s | 12.36s | Paralel İşleme Verimliliği |
| **Peak RAM (RSS)** | 129.3 MB | 139.44 MB | Beklenen RAM Kullanımı |
| **Peak Heap Used** | 28.24 MB | 30.47 MB | Bellek Yönetimi |

---

## 🔍 1. Senaryo — Sıralı Yükleme (Tek Tek) Detayları

- **Toplam Süre**: `190.69s`
- **Kullanıcı Deneyimi**: Her CV yüklendikten sonra analizin bitmesi beklenip ardından bir sonraki CV gönderildi.
- **Detaylı CV Çıktıları**:
  - **1. Beyaz Minimalist Pazarlama Müdürü Özgeçmiş.pdf**: Durum: `COMPLETED` | Süre: `51.70s` | Chunk Sayısı: `10` | ATS Skoru: `%85`
  - **2. Beyaz Siyah Basit Stilde Bilim ve Mühendislik Özgeçmişi (1).pdf**: Durum: `COMPLETED` | Süre: `34.33s` | Chunk Sayısı: `6` | ATS Skoru: `%85`
  - **3. Lila Minimal Profesyonel Yazılım Mühendisi İş Başvurusu CV Özgeçmiş.pdf**: Durum: `COMPLETED` | Süre: `35.67s` | Chunk Sayısı: `8` | ATS Skoru: `%85`
  - **4. Mavi Açık Mavi Renk Blokları Uçuş Görevlisi CV.pdf**: Durum: `COMPLETED` | Süre: `29.19s` | Chunk Sayısı: `5` | ATS Skoru: `%85`
  - **5. Mavi Modern Yalın Profesyonel  Özgeçmiş CV .pdf**: Durum: `COMPLETED` | Süre: `38.78s` | Chunk Sayısı: `10` | ATS Skoru: `%85`

---

## ⚡ 2. Senaryo — Toplu Yükleme (Aynı Anda) Detayları

- **Toplam Süre**: `61.78s`
- **Worker Pool Durumu**: `concurrency: 4` ayarı aktif. 5 CV aynı anda kuyruğa atıldığında ilk 4 CV paralel olarak **ACTIVE** duruma geçmiş, 5. CV sıradaki işçi boşalınca hemen devralınmıştır.
- **Detaylı CV Çıktıları**:
  - **1. Beyaz Minimalist Pazarlama Müdürü Özgeçmiş.pdf**: Durum: `COMPLETED` | Süre: `44.24s` | Chunk Sayısı: `10` | ATS Skoru: `%85`
  - **2. Beyaz Siyah Basit Stilde Bilim ve Mühendislik Özgeçmişi (1).pdf**: Durum: `COMPLETED` | Süre: `35.68s` | Chunk Sayısı: `6` | ATS Skoru: `%85`
  - **3. Lila Minimal Profesyonel Yazılım Mühendisi İş Başvurusu CV Özgeçmiş.pdf**: Durum: `COMPLETED` | Süre: `39.10s` | Chunk Sayısı: `8` | ATS Skoru: `%85`
  - **4. Mavi Açık Mavi Renk Blokları Uçuş Görevlisi CV.pdf**: Durum: `COMPLETED` | Süre: `61.00s` | Chunk Sayısı: `5` | ATS Skoru: `%85`
  - **5. Mavi Modern Yalın Profesyonel  Özgeçmiş CV .pdf**: Durum: `COMPLETED` | Süre: `38.41s` | Chunk Sayısı: `9` | ATS Skoru: `%85`

---

## ✅ Veri Doğrulama ve Sonuç

1. **Tamamlanma Doğrulaması**: Her iki senaryoda da yüklenen 5 CV'nin tamamı **COMPLETED** durumuna ulaşmıştır.
2. **Chunk & AI Bütünlüğü**: Tüm CV'lerin bölüm parçaları (Chunk) ve yapay zeka ATS analiz skorları eksiksiz üretilmiştir.
3. **Worker Pool Başarısı**: Concurrency: 4 yapısı sayesinde toplu yüklemede sistem kilitlenmeden, kaynakları verimli yöneterek **%67.6** performans artışı sağlamıştır.
