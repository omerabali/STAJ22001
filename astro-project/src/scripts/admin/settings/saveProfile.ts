import { showStatus } from './showStatus';

/**
 * Profil formu kaydetme — avatar upload, ad/email/telefon validasyonu ve API PUT.
 * Admin dashboard-stats cache'ini de geçersiz kılar (candidate'den farkı budur).
 */
export function initSaveProfile(): void {
  let currentAvatarBase64: string | null = null;

  const avatarInput = document.getElementById('avatar-input') as HTMLInputElement | null;
  if (avatarInput) {
    avatarInput.addEventListener('change', function (e) {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (file.size > 1024 * 1024) {
        showStatus('profile-status', "Dosya boyutu 1MB'ı geçemez.", true);
        return;
      }

      const reader = new FileReader();
      reader.onload = function (event) {
        currentAvatarBase64 = event.target?.result as string;
        const preview = document.getElementById('avatar-preview');
        if (preview) {
          preview.style.backgroundImage = `url(${currentAvatarBase64})`;
          preview.textContent = '';
        }
      };
      reader.readAsDataURL(file);
    });
  }

  const saveProfileBtn = document.getElementById('save-profile-btn') as HTMLButtonElement | null;
  if (!saveProfileBtn) return;

  saveProfileBtn.addEventListener('click', async () => {
    saveProfileBtn.disabled = true;
    const originalText = saveProfileBtn.textContent;
    saveProfileBtn.textContent = 'Kaydediliyor...';

    const name = (document.getElementById('profile-name') as HTMLInputElement)?.value || '';
    const email = (document.getElementById('profile-email') as HTMLInputElement)?.value || '';
    const phone = (document.getElementById('profile-phone') as HTMLInputElement)?.value || '';

    const nameRegex = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]{3,}$/;
    if (!nameRegex.test(name.trim())) {
      showStatus('profile-status', 'Ad Soyad en az 3 karakter olmalı ve yalnızca harflerden oluşmalıdır.', true);
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = originalText;
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email.trim())) {
      showStatus('profile-status', 'Yalnızca @gmail.com uzantılı e-posta adresleri kabul edilmektedir.', true);
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = originalText;
      return;
    }

    const phoneRegex = /^5\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      showStatus('profile-status', 'Telefon numarası 10 haneli olmalı ve 5 ile başlamalıdır (Örn: 5xxxxxxxxx).', true);
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = originalText;
      return;
    }

    const payload: any = { name, email, phone };
    if (currentAvatarBase64) payload.avatarUrl = currentAvatarBase64;

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showStatus('profile-status', 'Profil başarıyla güncellendi!');
        if ((window as any).__swrCache) {
          (window as any).__swrCache.invalidate('user-profile');
          (window as any).__swrCache.invalidate('dashboard-stats'); // Admin-specific
        }
        sessionStorage.removeItem('user-avatar');

        const avatarPreview = document.getElementById('avatar-preview');
        if (avatarPreview && !currentAvatarBase64 && (name || email)) {
          if (!avatarPreview.style.backgroundImage || avatarPreview.style.backgroundImage === 'none') {
            avatarPreview.textContent = (name || email).charAt(0).toUpperCase();
          }
        }
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showStatus('profile-status', data.message || 'Hata oluştu', true);
      }
    } catch {
      showStatus('profile-status', 'Sunucu hatası', true);
    } finally {
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = originalText;
    }
  });
}
