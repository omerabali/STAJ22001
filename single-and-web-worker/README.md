# 🧵 Main Thread vs. Web Worker — Fibonacci Karşılaştırma Uygulaması

Bu proje, **JavaScript'te Main Thread ile Web Worker** arasındaki farkı canlı olarak gösteren interaktif bir React uygulamasıdır. Staj projesi kapsamında hazırlanmıştır.

---

## 📌 Proje Hakkında

Tarayıcıda JavaScript **tek iş parçacıklı (single-threaded)** çalışır. Yoğun bir hesaplama işlemi başlatıldığında, bu işlem tamamlanana kadar kullanıcı arayüzü tamamen bloke olur — animasyonlar durur, yazı yazılamaz, butonlar tepki vermez.

**Web Worker API** sayesinde bu tür ağır işlemler, ana iş parçacığının dışında arka planda ayrı bir thread'de çalıştırılabilir. Bu sayede kullanıcı arayüzü donmadan çalışmaya devam eder.

Bu uygulama, O(2ⁿ) karmaşıklığına sahip **rekürsif Fibonacci** hesaplaması kullanarak bu farkı görsel olarak ortaya koymaktadır.

---

## 🚀 Özellikler

- **İki Panel Karşılaştırması:** Sol panel Main Thread'i, sağ panel Web Worker'ı simüle eder.
- **Canlı Animasyon İzleme:** Hesaplama sırasında animasyonun durması veya devam etmesi gözlemlenebilir.
- **Canlı Sayaç:** Her 40ms'de bir güncellenen sayaç, main thread'in bloke olup olmadığını gösterir.
- **Yazı Yazma Testi:** Hesaplama esnasında input kutusuna yazılmaya çalışılarak donma gözlemlenebilir.
- **Tıklama Testi:** Buton tıklamaları sayılarak responsiveness ölçülür.
- **Ayarlanabilir Fibonacci Derecesi:** Kaydırıcı ile F(35) - F(46) arasında hesaplama yapılabilir.
- **Worker İptal Etme:** Web Worker çalışırken `Kill Worker` butonu ile işlem iptal edilebilir.

---

## 🛠️ Teknolojiler

| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| React | ^19.2.6 | UI bileşenleri ve state yönetimi |
| Vite | ^8.0.12 | Geliştirme sunucusu ve bundle |
| Web Workers API | Native Browser API | Arka planda thread yönetimi |
| Blob URL | Native Browser API | Worker kodunu dinamik olarak oluşturma |

---

## ⚙️ Kurulum ve Çalıştırma

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev
```

Uygulama varsayılan olarak `http://localhost:5173` adresinde açılır.

---

## 🧪 Nasıl Test Edilir?

1. Üstteki kaydırıcıdan **F(42)** veya daha yüksek bir değer seçin.

2. **Sol Panel — Main Thread Testi:**
   - "Main Thread Bloke Et" butonuna tıklayın.
   - Hesaplama sırasında Canlı Animasyonun **durduğunu**, sayacın **donduğunu**, input kutusuna **yazamadığınızı** gözlemleyin.

3. **Sağ Panel — Web Worker Testi:**
   - "Web Worker ile Çalıştır" butonuna tıklayın.
   - Hesaplama arka planda çalışırken animasyonun **akmaya devam ettiğini**, sayacın **artmaya devam ettiğini**, yazı yazabildiğinizi gözlemleyin.

---

## 📁 Proje Yapısı

```
single-and-web-worker/
├── public/
├── src/
│   ├── App.jsx          # Ana uygulama bileşeni (Main Thread & Web Worker mantığı)
│   ├── App.css          # Uygulama stilleri
│   ├── index.css        # Global CSS değişkenleri ve tasarım sistemi
│   └── main.jsx         # React uygulama giriş noktası
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 💡 Temel Kavramlar

### Main Thread Neden Bloke Olur?
JavaScript motoru (V8), aynı anda yalnızca bir görevi çalıştırabilir. Fibonacci gibi yoğun bir hesaplama başladığında event loop tıkanır ve tarayıcı diğer görevleri (DOM güncellemeleri, animasyonlar, input olayları) işleyemez hale gelir.

### Web Worker Nasıl Çözer?
Web Worker, ayrı bir OS thread'inde çalışır. Ana thread ile `postMessage` / `onmessage` API'si aracılığıyla mesaj geçirerek iletişim kurar. DOM'a erişemez ancak yoğun CPU hesaplamalarını ana thread'i engellemeden yapabilir.

---

## 👤 Geliştirici

**Ömer Abalı** — Staj Projesi 2025  
GitHub: [@omerabali](https://github.com/omerabali)
