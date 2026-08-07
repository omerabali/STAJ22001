/**
 * inputFocusEffects.ts (Form Giriş Odaklanma Efekt Yöneticisi)
 * Görevi: Kayıt formundaki metin, e-posta, telefon ve şifre kutularına tıklandığında (focus)
 * kenarlıkların yeşil renkte parlamasını, odak çıkınca (blur) eski haline dönmesini sağlar.
 */
export function initInputFocusEffects(): void {
  document.querySelectorAll('.form-input').forEach((el) => {
    const input = el as HTMLInputElement;
    input.addEventListener('focus', () => {
      input.style.borderColor = '#2d5a45';
      input.style.boxShadow = '0 0 0 4px rgba(45,90,69,0.1)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#c0c9c2';
      input.style.boxShadow = 'none';
    });
  });
}
