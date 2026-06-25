---
title: JavaScript Async/Await
description: Promise tabanlı asenkron kodu async/await ile okunabilir hale getirmek.
pubDate: 2026-06-15
category: javascript
---

## Temel kullanım

`async/await`, Promise'leri senkron kod gibi yazmayı sağlar:

```javascript
async function veriGetir() {
  const response = await fetch('/api/yazilar');
  const data = await response.json();
  return data;
}
```

## Astro'da fetch

Astro sayfalarında `fetch` varsayılan olarak **build zamanında** çalışır. Blog listesi sayfasındaki JSONPlaceholder örneği tam olarak bunu gösterir — sayfa derlenirken API'den veri çekilir, sonuç statik HTML'e gömülür.

## Hata yönetimi

Gerçek projelerde `try/catch` ile ağ hatalarını yakalamak gerekir. Bu örnekte basitlik için doğrudan fetch kullanılmıştır.
