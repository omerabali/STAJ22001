/**
 * togglePassword.ts (Şifre Göster/Gizle Yöneticisi)
 * Görevi: Hem "Şifre" hem de "Şifre Tekrarı" alanlarının yanındaki "Göz" ikonlarına tıklandığında,
 * ilgili şifre alanlarının görünürlüğünü (type="password" <-> type="text") ve göz ikonlarını günceller.
 */
export function initTogglePassword(): void {
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  const togglePasswordBtn = document.getElementById('toggle-password');
  
  togglePasswordBtn?.addEventListener('click', () => {
    const isPass = passwordInput.type === 'password';
    passwordInput.type = isPass ? 'text' : 'password';
    const icon = togglePasswordBtn.querySelector('span');
    if (icon) icon.textContent = isPass ? 'visibility_off' : 'visibility';
  });

  const confirmPasswordInput = document.getElementById('confirm_password') as HTMLInputElement;
  const toggleConfirmBtn = document.getElementById('toggle-confirm-password');
  
  toggleConfirmBtn?.addEventListener('click', () => {
    const isPass = confirmPasswordInput.type === 'password';
    confirmPasswordInput.type = isPass ? 'text' : 'password';
    const icon = toggleConfirmBtn.querySelector('span');
    if (icon) icon.textContent = isPass ? 'visibility_off' : 'visibility';
  });
}
