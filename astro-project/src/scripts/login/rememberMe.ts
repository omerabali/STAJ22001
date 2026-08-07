/**
 * rememberMe.ts (Beni Hatırla Yöneticisi)
 * Görevi: Giriş sayfasında kullanıcı daha önce "Beni Hatırla" seçeneğini işaretlediyse,
 * localStorage alanına kaydedilmiş e-posta adresini otomatik okuyarak e-posta kutusuna doldurur.
 */
export function initRememberMe(): void {
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const rememberedEmail = localStorage.getItem('remembered_email');
  if (emailInput && rememberedEmail) {
    emailInput.value = rememberedEmail;
  }
}
