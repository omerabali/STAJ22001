/**
 * togglePassVisibility.ts (Ayarlar Şifre Göster/Gizle Yöneticisi)
 * Görevi: Ayarlar sayfasındaki "Mevcut Şifre", "Yeni Şifre" ve "Şifre Tekrarı" kutularının
 * sağındaki göz butonlarına tıklandığında şifreyi gizler veya gösterir. Global window nesnesine eklenir.
 */
export function initTogglePassVisibility(): void {
  (window as any).togglePassVisibility = function (inputId: string, btn: HTMLButtonElement): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
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
