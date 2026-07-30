/**
 * 2. Telefon Numarası Real-time Regex Filtresi ve İpucu Uyarısı
 */
export function initPhoneValidation(): void {
  const phoneInput = document.getElementById('phone') as HTMLInputElement;
  const phoneHint = document.getElementById('phone-hint') as HTMLParagraphElement;

  phoneInput?.addEventListener('input', () => {
    // Only allow digits
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
    const val = phoneInput.value;

    if (val.length > 0 && !val.startsWith('5')) {
      phoneHint.textContent = '⚠️ Telefon numarası 5 ile başlamalıdır (Örn: 532XXXXXXX)';
      phoneHint.style.color = '#f43f5e';
      phoneInput.style.borderColor = '#f43f5e';
    } else if (val.length > 0 && val.length < 10) {
      phoneHint.textContent = `10 haneli cep telefonunuz (Şu an: ${val.length}/10 hane)`;
      phoneHint.style.color = '#717973';
      phoneInput.style.borderColor = '#2d5a45';
    } else if (val.length === 10 && val.startsWith('5')) {
      phoneHint.textContent = '✓ Geçerli telefon numarası';
      phoneHint.style.color = '#10b981';
      phoneInput.style.borderColor = '#10b981';
    } else {
      phoneHint.textContent = '5 ile başlayan 10 haneli cep telefonunuz (Örn: 5321234567)';
      phoneHint.style.color = '#717973';
      phoneInput.style.borderColor = '#c0c9c2';
    }
  });
}
