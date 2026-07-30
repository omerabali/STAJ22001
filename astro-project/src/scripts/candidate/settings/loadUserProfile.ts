/**
 * Kullanıcı Profil Bilgilerini Yükleme
 * /api/auth/me endpoint'inden kullanıcı verisini çeker, form alanlarını doldurur.
 * SWR cache varsa kullanır, yoksa doğrudan fetch atar.
 */
export async function loadUserProfile(): Promise<void> {
  const fetcher = async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Fetch user profile error');
    return res.json();
  };

  const render = (data: any) => {
    if (data.user) {
      const nameInput = document.getElementById('profile-name') as HTMLInputElement;
      const emailInput = document.getElementById('profile-email') as HTMLInputElement;
      const phoneInput = document.getElementById('profile-phone') as HTMLInputElement;
      const avatarPreview = document.getElementById('avatar-preview') as HTMLElement;

      if (nameInput) nameInput.value = data.user.name || '';
      if (emailInput) emailInput.value = data.user.email || '';
      if (phoneInput) phoneInput.value = data.user.phone || '';

      if (data.user.avatarUrl && avatarPreview) {
        avatarPreview.style.backgroundImage = `url(${data.user.avatarUrl})`;
        avatarPreview.textContent = '';
      } else if (data.user.email && avatarPreview) {
        avatarPreview.textContent = (data.user.name || data.user.email).charAt(0).toUpperCase();
        avatarPreview.style.backgroundImage = 'none';
      }
    }
  };

  if ((window as any).__swrCache) {
    (window as any).__swrCache.query('user-profile', fetcher, render, 30000);
  } else {
    fetcher().then(render).catch((err: any) => console.error(err));
  }
}
