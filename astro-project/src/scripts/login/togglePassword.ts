/**
 * 3. Şifre Göster/Gizle Butonu (toggle-password)
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
