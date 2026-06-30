# Astro & Express Monorepo Projesi

Bu proje, frontend tarafında **Astro**, backend tarafında ise **Express.js (TypeScript & Prisma 7 & Supabase)** kullanan entegre bir yapıdır.

---

## 📂 Proje Yapısı

```text
/
├── public/                  # Astro statik dosyaları
├── src/                     # Astro frontend kaynak dosyaları
│   ├── lib/
│   │   └── supabase.ts      # Frontend Supabase istemci bağlantısı
│   └── ...
├── server/                  # Backend klasörü (Express.js)
│   ├── src/
│   │   └── index.ts         # Backend sunucusu giriş noktası ve rotalar
│   ├── prisma/
│   │   └── schema.prisma    # Veritabanı modeli (User, Role vb.)
│   ├── prisma.config.ts     # Prisma 7 konfigürasyon dosyası
│   ├── tsconfig.json        # TypeScript ayarları (NodeNext / ES2022)
│   └── package.json
├── package.json             # Root Astro projesi ayarları
└── .gitignore               # Tüm proje için git kuralları (Hassas bilgiler korunur!)
```

---

## 🚀 Kurulum ve Çalıştırma

### 0. Projeyi Klonlama
```bash
git clone https://github.com/omerabali/STAJ22001.git
cd STAJ22001/astro-project
```

### 1. Veritabanı ve Çevre Değişkenleri
Hem kök dizinde hem de `server/` dizininde ilgili veritabanı ayarlarını `.env` dosyaları üzerinden tanımlamanız gerekmektedir. 

*   **Root (Astro Frontend) `.env`**:
    ```env
    PUBLIC_SUPABASE_URL=https://<your-project-id>.supabase.co
    PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
    ```
*   **Server (Express Backend) `server/.env`**:
    ```env
    PORT=5000
    DATABASE_URL="postgresql://postgres.<id>:[password]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    DIRECT_URL="postgresql://postgres.<id>:[password]@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
    JWT_SECRET=super_secret_jwt_key_here
    ```

---

### 2. Projeyi Tek Komutla Başlatma (Frontend + Backend)
Kök dizinde bağımlılıkları yükleyin, veritabanını hazırlayın ve her iki sunucuyu da aynı anda çalıştırın:

```bash
# Kök dizin ve server bağımlılıklarını yükle
npm install
npm run install --prefix server

# Prisma modellerini veritabanına uygula ve client'ı üret
cd server
npx prisma db push
npx prisma generate
cd ..

# Hem Astro hem Express sunucusunu eşzamanlı çalıştırır
npm run dev:all
```

Astro projeniz **http://localhost:4321**, Express backend sunucunuz ise **http://localhost:5000** üzerinde ayağa kalkacaktır.

---

## 🔌 API Rotaları

*   **GET `/`**: Karşılama mesajını döner.
*   **GET `/api/health`**: Sunucunun aktifliğini ve Supabase veritabanına olan bağlantının doğruluğunu (`prisma.user.count()`) test eder.

---

## 🛡️ Güvenlik ve Git Kuralları
Kök dizindeki `.gitignore` dosyası, yerelde oluşturulan `.env` dosyalarının ve `node_modules` klasörlerinin yanlışlıkla git repolarına yüklenmesini engeller. Sunucu şifrenizi barındıran hassas veriler asla GitHub'a sızmaz.
