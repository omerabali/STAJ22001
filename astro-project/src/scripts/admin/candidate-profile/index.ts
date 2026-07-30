/**
 * candidate-profile sayfasının ana giriş noktası (entry point).
 * Tüm modülleri import eder, global fonksiyonları window'a bağlar ve
 * sayfa yüklendiğinde profili başlatır.
 */
import { loadAdminCandidateProfile } from './profileLoader';
import { handleCvSelectionChange } from './cvDropdown';
import { initReanalyzeCv } from './reanalyzeCv';

// ── Global fonksiyonları window'a bağla (HTML onclick handler'ları için) ──
(window as any).handleCvSelectionChange = handleCvSelectionChange;

// ── Reanalyze butonunu başlat ──
initReanalyzeCv();

// ── Dinamik geri butonu ──
function setupDynamicBackLink(): void {
  const backBtn = document.getElementById('profile-back-btn') as HTMLAnchorElement | null;
  if (!backBtn) return;

  const urlParams = new URLSearchParams(window.location.search);
  const fromSource = urlParams.get('from');
  const ref = document.referrer || '';

  if (fromSource === 'compare' || ref.includes('/admin/compare')) {
    backBtn.href = '/admin/compare?from=profile';
  } else if (fromSource === 'semantic' || (ref.includes('/admin/search') && ref.includes('semantic'))) {
    backBtn.href = '/admin/search?tab=semantic&from=profile';
  } else if (fromSource === 'basic' || (ref.includes('/admin/search') && ref.includes('basic'))) {
    backBtn.href = '/admin/search?tab=basic';
  } else if (fromSource === 'reports' || ref.includes('/admin/reports')) {
    backBtn.href = '/admin/reports';
  } else if (fromSource === 'users' || ref.includes('/admin/users')) {
    backBtn.href = '/admin/users';
  } else if (ref.includes('/admin/search')) {
    backBtn.href = '/admin/search?tab=semantic&from=profile';
  } else {
    backBtn.href = '/admin/compare?from=profile';
  }
}

// ── Sayfa başlatıcı ──
function initPage(): void {
  setupDynamicBackLink();
  loadAdminCandidateProfile();
}

// Astro View Transitions desteği
document.addEventListener('astro:page-load', initPage);

// İlk yükleme veya sayfa zaten hazırsa doğrudan başlat
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initPage();
}
