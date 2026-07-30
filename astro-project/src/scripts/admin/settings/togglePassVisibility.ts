/**
 * Şifre göster/gizle toggle — window.togglePassVisibility olarak kayıtlı.
 * Admin ayarlar sayfası HTML onClick'ten çağrılır.
 */
export function initTogglePassVisibility(): void {
  (window as any).togglePassVisibility = function (inputId: string, btn: HTMLButtonElement): void {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    const icon = btn.querySelector('.material-symbols-outlined');
    if (input && icon) {
      if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        icon.textContent = 'visibility';
      }
    }
  };
}
