/**
 * Analyses Sayfa Init Modülü
 * CV listesini ilk kez yükler ve astro:page-load event'ini dinler.
 */
import { loadCVList } from './cvListLoader';

export function initAnalysesPage(): void {
  const cvsBody = document.getElementById('analyses-cvs-body') as HTMLElement;
  if (cvsBody && !cvsBody.dataset.initialized) {
    cvsBody.dataset.initialized = 'true';
    loadCVList();
  }
}

document.addEventListener('astro:page-load', initAnalysesPage);

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initAnalysesPage();
}
