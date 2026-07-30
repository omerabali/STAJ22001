import { candProfileState } from './candProfileState';
import { renderCvDropdown, handleCvSelectionChange } from './cvDropdown';
import { renderSelectedCvDetails } from './cvDetailsRenderer';
import { setupRealtimeSocket } from './socketSetup';

/**
 * Ana profil yükleyici — URL'den candidateId alır, API'den çeker, tüm bileşenleri başlatır.
 */
export async function loadAdminCandidateProfile(): Promise<void> {
  const urlParams = new URLSearchParams(window.location.search);
  const candidateId = urlParams.get('id') || urlParams.get('userId') || '';
  const requestedCvId = urlParams.get('cvId');

  const loadingEl = document.getElementById('profile-loading');
  const contentEl = document.getElementById('profile-content');

  if (!candidateId) {
    if (loadingEl) loadingEl.innerHTML = '<p class="text-rose-600 font-bold text-sm">Hata: Görüntülenecek aday ID belirtilmedi.</p>';
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/candidates/${candidateId}`, { headers, credentials: 'include' });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        if (loadingEl) loadingEl.innerHTML = '<p class="text-rose-600 font-bold text-sm">Erişim Engellendi: Bu sayfayı görüntülemek için Admin yetkisi gereklidir.</p>';
        return;
      }
      throw new Error(`Aday verisi alınamadı (HTTP ${res.status})`);
    }

    const data = await res.json();
    const candidate = data.candidate;

    if (!candidate) {
      if (loadingEl) loadingEl.innerHTML = '<p class="text-rose-600 font-bold text-sm">Aday kaydı bulunamadı.</p>';
      return;
    }

    candProfileState.candidateUserId = candidate.id;
    candProfileState.candidateCvs = candidate.cvs || [];

    // Header info
    const set = (id: string, val: string) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('profile-name', candidate.name || candidate.email || 'İsimsiz Aday');
    set('profile-email', candidate.email || '-');
    set('profile-avatar', (candidate.name || candidate.email || 'AD').substring(0, 2).toUpperCase());

    const rawDate = candidate.createdAt ? new Date(candidate.createdAt) : null;
    set('profile-date', rawDate ? `Kayıt Tarihi: ${rawDate.toLocaleDateString('tr-TR')}` : 'Kayıt: -');

    renderCvDropdown(requestedCvId);
    if (candProfileState.activeCvId) renderSelectedCvDetails(candProfileState.activeCvId);

    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');

    // CV dropdown change handler
    (window as any).handleCvSelectionChange = handleCvSelectionChange;

    setupRealtimeSocket(candidate.id, loadAdminCandidateProfile);
  } catch (err: any) {
    if (loadingEl) loadingEl.innerHTML = `<p class="text-rose-600 font-bold text-sm">Hata: ${err.message}</p>`;
  }
}
