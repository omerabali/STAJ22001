/**
 * 1. Remembered Email (LocalStorage) Kontrolü
 */
export function initRememberMe(): void {
  const emailInput = document.getElementById('email') as HTMLInputElement;
  const rememberedEmail = localStorage.getItem('remembered_email');
  if (emailInput && rememberedEmail) {
    emailInput.value = rememberedEmail;
  }
}
