/**
 * togglePassword.ts (Şifre Göster/Gizle Yöneticisi)
 * Görevi: Şifre alanının yanındaki "Göz" ikonuna tıklandığında,
 * şifrenin gizli noktalarını metne çevirir (type="password" -> type="text") ve göz ikonunu günceller.
 */
export function initTogglePassword(): void {
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password') as HTMLInputElement;
  togglePasswordBtn?.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    const icon = togglePasswordBtn.querySelector('span');
    if (icon) icon.textContent = isPassword ? 'visibility_off' : 'visibility';
  });
}
