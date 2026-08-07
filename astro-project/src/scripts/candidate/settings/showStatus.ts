/**
 * showStatus.ts (Ayarlar Durum Mesajı Göstericisi)
 * Görevi: Ayarlar sayfasındaki profil veya şifre güncelleme işlemlerinde
 * yeşil (başarı) veya kırmızı (hata) durum mesajını ekrana yazar, 5 saniye sonra otomatik gizler.
 */
export function showStatus(elementId: string, message: string, isError = false): void {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden', 'bg-red-500/20', 'text-red-400', 'bg-green-500/20', 'text-green-400');
  if (isError) {
    el.classList.add('bg-red-500/20', 'text-red-400');
  } else {
    el.classList.add('bg-green-500/20', 'text-green-400');
  }
  setTimeout(() => { el.classList.add('hidden'); }, 5000);
}
