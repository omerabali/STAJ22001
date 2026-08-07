/**
 * deleteCv.ts (Aday CV Silme Yöneticisi)
 * Görevi: Çöp kutusu butonuna tıklandığında onay alır ve `/api/cv/${cvId}` adresine DELETE isteği atarak
 * CV dosyasını ve ilişkili tüm analiz verilerini veritabanından kalıcı olarak siler.
 */
import { analysesState } from './analysesState';
import { loadCVList } from './cvListLoader';

export function initDeleteCv(): void {
  (window as any).deleteCV = async function (cvId: string): Promise<void> {
    if (!confirm('Bu özgeçmişi ve tüm ilişkili verileri silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/cv/${cvId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Silme işlemi başarısız.');
      }

      if (analysesState.selectedCvId === cvId) {
        analysesState.selectedCvId = null;
        const noState = document.getElementById('no-analysis-state');
        const activeState = document.getElementById('active-analysis-state');
        noState?.classList.remove('hidden');
        activeState?.classList.add('hidden');
      }

      if ((window as any).__swrCache) {
        (window as any).__swrCache.invalidate('user-cvs');
        (window as any).__swrCache.invalidate('user-analyses');
      }

      await loadCVList();
    } catch (err: any) {
      console.error(err);
      alert(err.message);
    }
  };
}
