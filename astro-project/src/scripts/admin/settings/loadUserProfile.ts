/**
 * loadUserProfile.ts (Admin Profil Bilgileri Yükleyicisi)
 * Görevi: Admin ayarlar sayfası açıldığında `/api/auth/me` adresinden yönetici profil verilerini çeker ve alanlara yükler.
 */
export async function loadUserProfile(): Promise<void> {
  const fetcher = async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Fetch user profile error');
    return res.json();
  };

  const render = (data: any) => {
    if (!data.user) return;
    const nameInput = document.getElementById('profile-name') as HTMLInputElement | null;
    const emailInput = document.getElementById('profile-email') as HTMLInputElement | null;
    const phoneInput = document.getElementById('profile-phone') as HTMLInputElement | null;
    const avatarPreview = document.getElementById('avatar-preview');

    if (nameInput) nameInput.value = data.user.name || '';
    if (emailInput) emailInput.value = data.user.email || '';
    if (phoneInput) phoneInput.value = data.user.phone || '';

    if (data.user.avatarUrl && avatarPreview) {
      avatarPreview.style.backgroundImage = `url(${data.user.avatarUrl})`;
      avatarPreview.textContent = '';
    } else if (data.user.email && avatarPreview) {
      avatarPreview.textContent = (data.user.name || data.user.email).charAt(0).toUpperCase();
      (avatarPreview as HTMLElement).style.backgroundImage = 'none';
    }
  };

  if ((window as any).__swrCache) {
    (window as any).__swrCache.query('user-profile', fetcher, render, 30000);
  } else {
    fetcher().then(render).catch(err => console.error(err));
  }
}
