/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      id: string;
      email: string;
      role: 'ADMIN' | 'CANDIDATE';
      name?: string;
    } | null;
  }
}

// Ey TypeScript! Haberin olsun, biz Astro'nun locals hafızasına user adında bir çekmece koyacağız.
// Bu çekmecenin içinde kullanıcının id'si, email'i ve role (ADMIN/CANDIDATE) bilgisi olacak.
// Kod yazarken bunu görünce kızma, bilakis bize yardımcı ol!

//Kullanıcı sayfaya tıklandığı o tek bir saniye boyunca sunucu "Bu sayfayı isteyen kullanıcı kimmiş?" 
// bilgisini Astro.locals.user içinde tutar. Sayfa ekrana çizilince bu hafıza sıfırlanır.