/**
 * initPage.ts (Analizler Sayfası Başlatıcı)
 * Görevi: Analizler sayfası açıldığında (`astro:page-load`) CV listesini ilk kez yüklemek için loadCVList'i çağırır.
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
