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
    SUPABASE_URL=https://<your-project-id>.supabase.co
    SUPABASE_SECRET_KEY=<your-secret-key>
    SUPABASE_JWKS_URL=https://<your-project-id>.supabase.co/auth/v1/.well-known/jwks.json
    ```

---

### 2. Frontend'i Çalıştırma (Astro)
Kök dizinde bağımlılıkları yükleyin ve geliştirici sunucusunu başlatın:

```bash
# Bağımlılıkları yükle
npm install

# Geliştirici sunucusunu çalıştır (varsayılan: http://localhost:4321)
npm run dev
```

---

### 3. Backend'i Çalıştırma (Express & Prisma)
`server` klasörüne geçiş yapıp kurulumu yapın:

```bash
cd server

# Bağımlılıkları yükle
npm install

# Prisma istemcisini oluştur
npx prisma generate

# Geliştirici sunucusunu izleme (watch) modunda çalıştır (varsayılan: http://localhost:5000)
npm run dev
```

---

## 🔌 API Rotaları

*   **GET `/`**: Karşılama mesajını döner.
*   **GET `/api/health`**: Sunucunun aktifliğini ve Supabase veritabanına olan bağlantının doğruluğunu (`prisma.user.count()`) test eder.

---

## 🛡️ Güvenlik ve Git Kuralları
Kök dizindeki `.gitignore` dosyası, yerelde oluşturulan `.env` dosyalarının ve `node_modules` klasörlerinin yanlışlıkla git repolarına yüklenmesini engeller. Sunucu şifrenizi barındıran hassas veriler asla GitHub'a sızmaz.
