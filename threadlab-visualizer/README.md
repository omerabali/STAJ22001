# 🚀 ThreadLab Visualizer

JavaScript'te **Multi-threading (Web Workers)** ve **Dinamik Yük Dengeleme (Load Balancing)** konseptlerini görselleştiren interaktif bir laboratuvar uygulaması.

## 🎯 Projenin Amacı
Bu projenin temel amacı, büyük bir hesaplama yükünün (geniş bir aralıktaki asal sayıların tespiti) tek bir iş parçacığı yerine birden çok iş parçacığına (Thread) dağıtıldığında performansın nasıl ölçeklendiğini kanıtlamaktır. Dünkü projenin üzerine çıkarak işi sadece "UI donmasını engellemek" boyutundan çıkarıp "Paralel Performans Ölçeklendirmesi" boyutuna taşır.

## ✨ Öne Çıkan Özellikler
- **Gerçek Zamanlı Web Workers:** Ana thread'i (UI) kilitletmeden, arka planda dinamik olarak oluşturulan Worker'lar ile ağır matematiksel işlemler.
- **Dinamik Yük Dengeleme (Load Balancing):** İş parçacıkları boşta beklemez; işi erken bitiren thread, kuyruktaki sıradaki görevi otomatik olarak alır.
- **Gantt Şeması ile Görselleştirme:** Her bir thread'in hangi görevi ne kadar sürede tamamladığını anlık olarak gösteren akan renkli zaman çizelgesi.
- **Performans Kıyaslaması:** 1 Thread (referans) ile çoklu Thread testlerinin sonuçlarını kıyaslayan geçmiş test tablosu.

## 🛠️ Kurulum ve Çalıştırma

1. Proje dizinine gidin:
   ```bash
   cd threadlab-visualizer
   ```
2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```
3. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

## 💻 Tech Stack
- React 18 (Hooks, Functional Components)
- Web Worker API (Blob üzerinden dinamik oluşturma)
- Modern Vanilla CSS (Neon / Dark Theme)
- Vite
