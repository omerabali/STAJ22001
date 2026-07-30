/**
 * 5. Kayıt Ol Butonu Hover ve Animasyon Efektleri
 */
export function initButtonHoverEffects(): void {
  const registerBtn = document.getElementById('register-btn');
  registerBtn?.addEventListener('mouseover', () => {
    (registerBtn as HTMLButtonElement).style.background = '#224f3b';
    (registerBtn as HTMLButtonElement).style.transform = 'translateY(-1px)';
  });
  registerBtn?.addEventListener('mouseout', () => {
    (registerBtn as HTMLButtonElement).style.background = '#2d5a45';
    (registerBtn as HTMLButtonElement).style.transform = 'translateY(0)';
  });
}
