/**
 * pageInit.ts (Admin CV Yükleme Sayfası Başlatıcısı)
 * Görevi: Admin CV Yükleme sayfası açıldığında tekli/toplu yükleme sürükle-bırak alanlarını,
 * aday listesini ve WebSocket olaylarını başlatan ana kurucu değişkendir.
 */
import { loadCandidates, updateSelectedCard } from './candidateSelector.ts';
import { setupSingleUpload } from './singleUploadLogic.ts';
import { setupBulkUpload } from './bulkUploadEngine.ts';
import { switchTab } from './tabSwitcher.ts';

export function initAdminUploadPage(socket: any, loadCVList: () => void): void {
  const body = document.getElementById('my-cvs-body');
  if (body && !body.dataset.initialized) {
    body.dataset.initialized = 'true';
    
    loadCandidates();
    loadCVList();
    setupSingleUpload(socket, loadCVList);
    setupBulkUpload(socket, loadCVList);

    document.getElementById('tab-single')?.addEventListener('click', () => switchTab('single'));
    document.getElementById('tab-bulk')?.addEventListener('click', () => switchTab('bulk'));
    document.getElementById('admin-candidate-select')?.addEventListener('change', updateSelectedCard);
  }
}
