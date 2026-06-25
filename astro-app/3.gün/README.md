# Gün 3 — SSR, API Endpoints ve React Entegrasyonu

Staj programının Astro eğitim bölümünün üçüncü gününde, önceki iki günde edinilen statik sayfa yapısı ve içerik koleksiyonu bilgilerinin üzerine sunucu taraflı işleme (Server-Side Rendering) katmanı eklenerek gerçek bir kimlik doğrulama akışı içeren mini uygulama geliştirilmiştir. Bu çalışma, ilerleyen süreçte geliştirilecek olan CV Lens projesine doğrudan altyapı sağlamak amacıyla tasarlanmıştır.

## Önceki Günlere Ek Öğrenilen Kavramlar

Birinci günde statik HTML sayfaları ve bileşen yapısı, ikinci günde içerik koleksiyonları ve dinamik routing incelenmişti. Üçüncü günde bu bilgiler korunarak aşağıdaki kavramlar projeye dahil edilmiştir:

- **SSR Modu (`output: 'server'`):** Astro'nun varsayılan statik derleme davranışı değiştirilerek her istek geldiğinde sayfa sunucuda üretilecek şekilde yapılandırılmıştır. Bu mod; dinamik oturum kontrolü, kişiselleştirilmiş içerik ve gerçek zamanlı veri gibi senaryoları mümkün kılar.

- **API Endpoints (`/api/...`):** Astro'nun `pages/api/` dizini altına TypeScript dosyaları yerleştirerek HTTP metodlarına (`GET`, `POST`) yanıt veren endpointler oluşturulmuştur. Sayfalardan bağımsız bu yapı, hem form gönderimlerini hem de JSON tabanlı istekleri karşılayabilmektedir.

- **React Entegrasyonu (Astro İçinde Island Mimarisi):** `@astrojs/react` entegrasyonu eklenerek Astro sayfaları içine React bileşenleri gömülmüştür. `client:load` direktifi sayesinde bileşenin yalnızca tarayıcı tarafında hydrate olması sağlanmış; bu yöntemle Astro'nun "island" mimarisi uygulamalı olarak gözlemlenmiştir.

- **Form Handling:** Native HTML form ile `action="/api/login" method="post"` yapısı kullanılarak sunucu taraflı form işleme gerçekleştirilmiştir. API endpoint'i gelen `formData()` ve `application/json` içerik tiplerini ayrı ayrı ele alacak biçimde tasarlanmıştır.

- **Environment Variables:** Kimlik bilgileri ve oturum sırrı gibi hassas veriler `.env.example` dosyasıyla tanımlanmış, `import.meta.env` aracılığıyla hem sunucu hem de API katmanında erişilmiştir. Güvenli olmayan ortamlarda varsayılan değerlere düşecek fallback mekanizması da uygulanmıştır.

## Proje: Mini Kimlik Doğrulama Uygulaması

Yukarıdaki kavramları tek bir akışta birleştiren, giriş formu ve korumalı panel sayfasından oluşan küçük bir uygulama geliştirilmiştir.

### Proje Yapısı

```
src/
├── components/
│   └── AuthStatus.tsx        # React island — /api/me'yi client-side çağırır
├── layouts/
│   └── AppLayout.astro
├── lib/
│   └── auth.ts               # Session token üretimi ve doğrulaması, env okuma
├── pages/
│   ├── index.astro           # Yönlendirme sayfası
│   ├── login.astro           # Giriş formu
│   ├── dashboard.astro       # Korumalı sayfa (SSR, server-side cookie kontrolü)
│   └── api/
│       ├── login.ts          # POST — kimlik doğrulama, cookie set
│       ├── logout.ts         # POST — cookie silme, yönlendirme
│       └── me.ts             # GET — oturum durumunu JSON olarak döner
└── styles/
```

### Kimlik Doğrulama Akışı

1. Kullanıcı `/login` sayfasındaki formu doldurur ve gönderir.
2. `POST /api/login` endpoint'i, kimlik bilgilerini environment variable'dan okunan demo kullanıcıyla karşılaştırır.
3. Doğrulama başarılıysa `httpOnly` bir session cookie oluşturulur ve `/dashboard`'a yönlendirilir.
4. `/dashboard` sayfası, SSR render başlamadan önce cookie'yi okur; geçersiz ya da eksikse `/login`'e yönlendirir.
5. Sayfadaki `AuthStatus` React bileşeni `client:load` ile hydrate olur ve `/api/me`'ye fetch yaparak oturum durumunu ayrıca gösterir.

### Teknolojiler

| Paket | Sürüm | Kullanım amacı |
|---|---|---|
| `astro` | ^7.0.2 | SSR çatısı |
| `@astrojs/node` | ^11.0.0 | Node.js standalone adapter |
| `@astrojs/react` | ^6.0.0 | React island entegrasyonu |
| `react` / `react-dom` | ^19.2.7 | UI bileşeni |

### Çalıştırma

```bash
cp .env.example .env
npm install
npm run dev
```

Demo giriş bilgileri:

```
Email    : demo@cvlens.dev
Şifre    : cv-lens-demo
```

### Environment Variables

| Değişken | Açıklama |
|---|---|
| `AUTH_USERNAME` | Demo kullanıcı e-posta adresi |
| `AUTH_PASSWORD` | Demo kullanıcı şifresi |
| `AUTH_SESSION_SECRET` | Session token imzalama anahtarı |
| `PUBLIC_APP_NAME` | Uygulama adı (istemcide de erişilebilir) |

---

## CV Lens Bağlantısı

Bu çalışmada uygulanan SSR + cookie guard + API endpoint + React island kombinasyonu, CV Lens projesindeki aday yükleme ekranı, analiz geçmişi ve kullanıcı paneli gibi bölümler için doğrudan temel alınabilecek bir örüntü sunmaktadır. Özellikle `readSessionUser` ile kurulan sunucu taraflı koruma mekanizması ve `AuthStatus` bileşeniyle gösterilen istemci-sunucu iletişim modeli, daha kapsamlı bir kimlik doğrulama altyapısına genişletilebilir niteliktedir.

---

*Demo ortamında kullanılan kimlik bilgileri ve session anahtarı gerçek bir projeye taşınmadan önce mutlaka değiştirilmelidir.*

---

## Staj Defteri Yazısı

---

**Tarih:** 25 / 06 / 2026
**Staj Konusu:** Astro Web Framework — Sunucu Taraflı İşleme, API Geliştirme ve React Entegrasyonu
**Staj Günü:** 3. Gün

### Yapılan Çalışmalar

Astro öğrenme sürecinin üçüncü gününde, önceki iki günde oluşturulan statik portfolyo ve dinamik blog sistemi altyapısının üzerine sunucu taraflı işleme (SSR) katmanı eklenerek giriş formu ve korumalı panel sayfasından oluşan bir kimlik doğrulama uygulaması geliştirilmiştir.

Çalışmaya Astro'nun statik derleme modunun sunucu taraflı moda geçirilmesiyle başlanmıştır. Bu yapılandırmayla birlikte her HTTP isteğinde sayfanın sunucu üzerinde üretildiği ve oturum kontrolü gibi dinamik senaryoların mümkün hale geldiği gözlemlenmiştir. pages/api/ dizini altında TypeScript tabanlı login, logout ve me olmak üzere üç API endpoint'i oluşturulmuş; giriş endpoint'i hem form verisi hem de JSON formatındaki gönderileri işleyecek biçimde tasarlanmıştır.

Hassas verilerin kaynak koddan ayrıştırılması amacıyla kullanıcı adı, parola ve oturum imzalama anahtarı ortam değişkenleri aracılığıyla yönetilmiştir. React entegrasyonu eklenerek AuthStatus bileşeni, yalnızca tarayıcı tarafında hydrate olacak biçimde panel sayfasına gömülmüş; bu yöntemle sunucu taraflı render ile istemci taraflı React island'ının aynı sayfa üzerinde bir arada çalışabildiği somut olarak incelenmiştir.

Geliştirme sürecinin sonunda giriş akışı, yönlendirmeler ve oturum koruma mekanizması test edilmiş; kimlik doğrulama akışının uçtan uca beklenen biçimde çalıştığı doğrulanmıştır.
