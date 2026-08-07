/**
 * savePassword.ts (Aday Şifre Güncelleme Yöneticisi)
 * Görevi: Mevcut şifre, yeni şifre ve şifre tekrarı alanlarını denetler.
 * Uyumluysa /api/auth/profile adresine PUT isteği atarak kullanıcının şifresini güvenle günceller.
 */
import { showStatus } from './showStatus';

export function initSavePassword(): void {
  const savePasswordBtn = document.getElementById('save-password-btn') as HTMLButtonElement;
  if (!savePasswordBtn) return;

  savePasswordBtn.addEventListener('click', async () => {
    const currentPassword = (document.getElementById('current-password') as HTMLInputElement).value;
    const newPassword = (document.getElementById('new-password') as HTMLInputElement).value;
    const confirmPassword = (document.getElementById('confirm-password') as HTMLInputElement).value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showStatus('password-status', 'Lütfen tüm şifre alanlarını doldurun.', true);
      return;
    }

    if (newPassword !== confirmPassword) {
      showStatus('password-status', 'Yeni şifreler eşleşmiyor.', true);
      return;
    }

    savePasswordBtn.disabled = true;
    const originalText = savePasswordBtn.textContent || '';
    savePasswordBtn.textContent = 'Güncelleniyor...';

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, password: newPassword })
      });
      const data = await res.json();

      if (res.ok) {
        showStatus('password-status', 'Şifreniz başarıyla güncellendi!');
        (document.getElementById('current-password') as HTMLInputElement).value = '';
        (document.getElementById('new-password') as HTMLInputElement).value = '';
        (document.getElementById('confirm-password') as HTMLInputElement).value = '';
      } else {
        showStatus('password-status', data.message || 'Hata oluştu', true);
      }
    } catch (err) {
      showStatus('password-status', 'Sunucu hatası', true);
    } finally {
      savePasswordBtn.disabled = false;
      savePasswordBtn.textContent = originalText;
    }
  });
}
