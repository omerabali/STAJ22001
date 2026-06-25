---
title: CSS Grid İpuçları
description: Responsive layout için CSS Grid'in pratik kullanım örnekleri.
pubDate: 2026-06-18
category: web
---

## auto-fill vs auto-fit

Kart grid'lerinde şu pattern sık kullanılır:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}
```

`auto-fill` boş sütunları korur; `auto-fit` ise mevcut alanı doldurmak için sütunları genişletir.

## gap kullanımı

Margin yerine `gap` tercih etmek hem daha temiz hem de eşit aralık sağlar. Bu projedeki proje ve blog kartları bu yaklaşımla düzenlenmiştir.

## minmax ile esneklik

`minmax(260px, 1fr)` sayesinde kartlar küçük ekranlarda tek sütuna, geniş ekranlarda ise otomatik çok sütuna geçer.
