/**
 * 3. Canlı Şifre Gücü Ölçer (strength-1, strength-2, strength-3)
 */
export function initPasswordStrength(): void {
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const strength1 = document.getElementById('strength-1') as HTMLDivElement;
  const strength2 = document.getElementById('strength-2') as HTMLDivElement;
  const strength3 = document.getElementById('strength-3') as HTMLDivElement;
  const strengthText = document.getElementById('strength-text') as HTMLParagraphElement;

  passwordInput?.addEventListener('input', () => {
    const val = passwordInput.value;
    let strength = 0;
    if (val.length >= 6) strength = 1;
    if (val.length >= 8 && /[a-z]/.test(val) && /[A-Z]/.test(val) && /\d/.test(val)) strength = 2;
    if (val.length >= 10 && /[a-z]/.test(val) && /[A-Z]/.test(val) && /\d/.test(val) && /[^A-Za-z0-9]/.test(val)) strength = 3;

    if (val.length === 0) {
      strength1.style.background = '#e5e7eb'; 
      strength2.style.background = '#e5e7eb'; 
      strength3.style.background = '#e5e7eb';
      strengthText.textContent = 'Şifre gücü: Bekleniyor'; 
      strengthText.style.color = '#717973'; 
      return;
    }

    if (strength === 0 || strength === 1) {
      strength1.style.background = '#f43f5e'; 
      strength2.style.background = '#e5e7eb'; 
      strength3.style.background = '#e5e7eb';
      strengthText.textContent = val.length < 6 ? 'Şifre gücü: Çok Zayıf (en az 6 karakter)' : 'Şifre gücü: Zayıf'; 
      strengthText.style.color = '#f43f5e';
    } else if (strength === 2) {
      strength1.style.background = '#f59e0b'; 
      strength2.style.background = '#f59e0b'; 
      strength3.style.background = '#e5e7eb';
      strengthText.textContent = 'Şifre gücü: Orta'; 
      strengthText.style.color = '#f59e0b';
    } else if (strength === 3) {
      strength1.style.background = '#10b981'; 
      strength2.style.background = '#10b981'; 
      strength3.style.background = '#10b981';
      strengthText.textContent = 'Şifre gücü: Güçlü'; 
      strengthText.style.color = '#10b981';
    }
  });
}
