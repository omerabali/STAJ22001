# Gün 1 — Kişisel Portfolyo

Astro ile yapılmış üç sayfalık kişisel web sitesi: ana sayfa, hakkımda ve projeler.

## Ne kullanıldı?

- Astro
- HTML ve CSS

## Site sayfaları

| Sayfa | Ne var? |
|-------|---------|
| Ana sayfa | Kısa tanıtım, projelere giden buton |
| Hakkımda | Kendini anlatan metin, beceriler, iletişim |
| Projeler | Üç proje kartı |

## Nasıl çalıştırılır?

Proje klasöründe terminal açıp sırasıyla:

```sh
npm install
npm run dev
```

Tarayıcıda site açılır. Yayına hazır sürüm için `npm run build` yeterli.

---

## Staj Defteri Yazısı

---

**Tarih:** 25 / 06 / 2026  
**Staj Konusu:** Astro Web Framework — Temel Kavramlar ve Kişisel Portfolyo Uygulaması  
**Staj Günü:** 1. Gün

### Yapılan Çalışmalar

Astro öğrenme yolculuğumun 1. günü doğrultusunda framework'ün temel tasarım anlayışını ve temel işlevlerini öğrendim. Bu doğrultuda öğrendiklerimi pekiştirmek amacıyla üç sayfalık bir kişisel portfolyo web sitesi geliştirdim.

Gün boyunca önce Astro'nun dosya tabanlı yönlendirme mantığını inceledim; her sayfanın ayrı bir dosya olarak tanımlandığını ve bu yapının otomatik olarak sayfa yönlendirmesini oluşturduğunu kavradım. Daha sonra tekrar eden üst menü ve alt bilgi gibi ortak alanları layout bileşeniyle tek bir yerden yönettim ve sayfa içeriklerini bu ortak yapıya bağladım. Navigasyon menüsü, footer ve proje kartı gibi arayüz parçalarını ayrı bileşenlere böldüm; projeler sayfasındaki kart verilerini bileşenlere parametre olarak ilettim. Stil tanımlarını her bileşenin kendi içinde tutarak bileşenlerin birbirinden bağımsız görünüm yönetmesini sağladım.

Projeyi geliştirme ortamında çalıştırarak test ettim, ardından üretim derlemesini tamamladım. Üç sayfanın eksiksiz derlendiğini ve sayfalararası geçişlerin doğru çalıştığını doğruladım.
