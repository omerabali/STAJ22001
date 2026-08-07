/**
 * reanalyzeCv.ts (Yeniden AI Analizi Başlatma Yöneticisi)
 * Görevi: "Yeniden Analiz Et" butonuna basıldığında `/api/cv/${cvId}/reanalyze` ucuna istek atarak
 * seçili CV için yapay zeka analizini baştan başlatır ve canlı durum güncellemelerini ekrana yansıtır.
 */
import { analysesState } from './analysesState';
import { loadCVList } from './cvListLoader';
export function initReanalyzeCandidateCv(): void {
  (window as any).reanalyzeSelectedCv = async function (): Promise<void> {
    const cvId = analysesState.selectedCvId;
    if (!cvId) {
      alert("Lütfen önce listeden yeniden analiz etmek istediğiniz bir özgeçmiş seçin.");
      return;
    }

    const btn = document.getElementById('reanalyze-candidate-btn') as HTMLButtonElement | null;
    const originalText = btn ? btn.innerHTML : '';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Yapay Zeka Yeniden Analiz Ediyor...`;
    }

    // Sağ panele anında canlı Yükleniyor / İşleniyor görselini göster
    const statusIndicator = document.getElementById('analysis-status-indicator');
    const contentArea = document.getElementById('analysis-content-area');

    if (statusIndicator) {
      statusIndicator.innerHTML = `<span class="material-symbols-outlined text-blue-600 text-3xl animate-spin">progress_activity</span>`;
    }

    if (contentArea) {
      contentArea.innerHTML = `
        <div class="text-center py-12 text-[#8a8580] flex flex-col items-center justify-center h-full space-y-6 my-auto">
          <div class="w-24 h-24 rounded-full border border-blue-200 bg-blue-50 flex items-center justify-center shadow-sm">
            <span class="material-symbols-outlined text-5xl text-blue-600 animate-spin">progress_activity</span>
          </div>
          <div class="text-center w-full max-w-[360px] px-4 mx-auto space-y-2">
            <h3 class="text-base font-bold text-[#1b1c1a]">Yapay Zeka Analiz Ediyor...</h3>
            <p class="text-xs text-[#8a8580] leading-relaxed font-medium">Özgeçmiş PDF belgesi baştan işleniyor, semantik parçalar ve GPT skorlama raporu güncelleniyor.</p>
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 text-[11px] font-semibold rounded-full mt-2">
              <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              Canlı Akış Takip Ediliyor
            </div>
          </div>
        </div>
      `;
    }

    try {
      const res = await fetch(`/api/cv/${cvId}/reanalyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (res.ok) {
        // Sol listeyi yenile (durum PENDING / PROCESSING görünecektir)
        loadCVList();

        // 2 saniyede bir polling ile tamamlanıp tamamlanmadığını kontrol et
        if (analysesState.activeInterval) {
          clearInterval(analysesState.activeInterval);
        }

        analysesState.activeInterval = setInterval(async () => {
          await loadCVList();
        }, 3000);

      } else {
        const data = await res.json().catch(() => ({}));
        alert(`❌ Analiz başlatılamadı: ${data.message || 'Sunucu hatası'}`);
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      }
    } catch (err: any) {
      alert(`❌ Sunucu bağlantı hatası: ${err.message || String(err)}`);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  };
}
