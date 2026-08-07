/**
 * reanalyzeCv.ts (Admin Aday CV Yeniden AI Analizi Başlatıcı)
 * Görevi: Admin panelinde bir adayın CV'si için "Yeniden Analiz Et" butonuna basıldığında
 * yapay zeka analizini baştan tetikler ve canlı süreç ekranını gösterir.
 */
import { candProfileState } from './candProfileState';

function showToastNotification(title: string, message: string, type: 'success' | 'error' = 'success'): void {
  const existingToast = document.getElementById('custom-toast-notification');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.id = 'custom-toast-notification';
  toast.className = `fixed bottom-6 right-6 z-50 flex items-center gap-3.5 px-5 py-4 rounded-[14px] shadow-2xl border transition-all duration-300 transform translate-y-10 opacity-0 ${
    type === 'success'
      ? 'bg-[#14422f] text-white border-emerald-500/30'
      : 'bg-rose-900 text-white border-rose-500/30'
  }`;

  toast.innerHTML = `
    <div class="w-9 h-9 rounded-xl ${type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'} flex items-center justify-center shrink-0">
      <span class="material-symbols-outlined text-xl">${type === 'success' ? 'auto_awesome' : 'error'}</span>
    </div>
    <div>
      <h5 class="text-xs font-bold text-white tracking-wide">${title}</h5>
      <p class="text-[11px] text-gray-200 font-medium mt-0.5">${message}</p>
    </div>
    <button onclick="this.parentElement.remove()" class="ml-3 text-gray-400 hover:text-white transition-colors cursor-pointer">
      <span class="material-symbols-outlined text-base">close</span>
    </button>
  `;

  document.body.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-10', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  }, 50);

  // Auto remove after 5s
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-10', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

/**
 * Aktif CV'yi yeniden analiz etmeyi tetikler ve dürüst canlı durum bildirimi ile polling sağlar.
 */
export function initReanalyzeCv(): void {
  (window as any).reanalyzeActiveCv = async function (): Promise<void> {
    const cvId = candProfileState.activeCvId;
    if (!cvId) return;

    const banner = document.getElementById('live-processing-banner');
    const statusBadge = document.getElementById('profile-status-badge');

    // UI'da buton durumunu değiştir
    const btn = document.querySelector('button[onclick="reanalyzeActiveCv()"]') as HTMLButtonElement | null;
    let originalBtnHtml = '';
    if (btn) {
      originalBtnHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">sync</span> AI Analiz Ediliyor...`;
      btn.classList.add('opacity-75', 'cursor-not-allowed');
    }

    // Canlı Bilgilendirme Bandını Aç
    if (banner) {
      banner.classList.remove('hidden');
      banner.className = 'bg-blue-50 border border-blue-200 text-blue-900 rounded-[14px] p-4 flex items-center justify-between shadow-2xs animate-pulse';
      banner.innerHTML = `
        <div class="flex items-center gap-3 w-full">
          <span class="material-symbols-outlined text-blue-600 text-2xl animate-spin shrink-0">psychology</span>
          <div class="flex-1">
            <h4 class="text-xs font-bold text-blue-900">Yapay Zeka CV Analizi İşleniyor...</h4>
            <p id="reanalyze-status-text" class="text-[11px] text-blue-700 font-medium mt-0.5">
              Tüm CV metni yapay zeka (GPT-4o-mini) tarafından tek hamlede analiz ediliyor ve 5 boyutlu İK değerlendirmesi hazırlanıyor...
            </p>
          </div>
        </div>
      `;
    }

    if (statusBadge) {
      statusBadge.className = 'px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse';
      statusBadge.textContent = 'Analiz Ediliyor';
    }

    // Skeletons gösterilmesi için profili tazele
    const { renderSelectedCvDetails } = await import('./cvDetailsRenderer');
    renderSelectedCvDetails(cvId);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/cv/${cvId}/reanalyze`, {
        method: 'POST',
        headers,
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Reanalyze isteği başarısız oldu');
      }

      showToastNotification("AI Analizi Başlatıldı 🚀", "Yapay zeka CV dökümanını analiz etmeye başladı.");

      let pollAttempts = 0;
      const maxPollAttempts = 60; // 60 * 1.5s = 90 saniye maksimum limit (Ağır GPT analizi için yeterli süre)

      // Polling mekanizması (Her 1.5 saniyede bir kontrol et)
      const pollInterval = setInterval(async () => {
        pollAttempts++;
        try {
          const { loadAdminCandidateProfile } = await import('./profileLoader');
          await loadAdminCandidateProfile();

          // Aktif analiz bitti mi kontrol et
          const selectedCv = candProfileState.candidateCvs.find((c: any) => c.id === cvId);
          const latestAnalysis = selectedCv?.analyses?.[0];

          if (latestAnalysis && latestAnalysis.status === 'COMPLETED') {
            clearInterval(pollInterval);

            // Banner'ı tamamen gizle ve banner kilidini kaldır
            if (banner) {
              banner.classList.add('hidden');
            }

            if (btn) {
              btn.disabled = false;
              btn.innerHTML = originalBtnHtml;
              btn.classList.remove('opacity-75', 'cursor-not-allowed');
            }

            // Anında güncel verileri render et!
            renderSelectedCvDetails(cvId);

            showToastNotification(
              "🎉 Yeniden Analiz Başarıyla Tamamlandı!",
              `ATS Skoru: %${latestAnalysis.atsScore || 0} - Tüm yetkinlikler güncellendi.`
            );
          } else if (latestAnalysis && latestAnalysis.status === 'FAILED') {
            clearInterval(pollInterval);

            if (banner) {
              banner.className = 'bg-rose-50 border border-rose-200 text-rose-900 rounded-[14px] p-4 flex items-center gap-3 shadow-2xs';
              banner.innerHTML = `
                <span class="material-symbols-outlined text-rose-600 text-xl">error</span>
                <p class="text-xs font-bold">Analiz başarısız oldu. Lütfen CV dosyasını veya bağlantıyı kontrol edin.</p>
              `;
            }

            if (btn) {
              btn.disabled = false;
              btn.innerHTML = originalBtnHtml;
              btn.classList.remove('opacity-75', 'cursor-not-allowed');
            }

            showToastNotification("Analiz Başarısız ❌", "CV analizi sırasında bir hata oluştu.", "error");
          } else if (pollAttempts >= maxPollAttempts) {
            // Zaman aşımı
            clearInterval(pollInterval);
            if (banner) banner.classList.add('hidden');
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = originalBtnHtml;
              btn.classList.remove('opacity-75', 'cursor-not-allowed');
            }
          }
        } catch (pollErr) {
          console.error("Polling hatası:", pollErr);
        }
      }, 1500);

    } catch (err) {
      console.error(err);
      showToastNotification("Analiz Başlatılamadı ❌", "Sunucu hatası oluştu. Lütfen tekrar deneyin.", "error");

      if (banner) {
        banner.className = 'bg-rose-50 border border-rose-200 text-rose-900 rounded-[14px] p-4 flex items-center gap-3 shadow-2xs';
        banner.innerHTML = `
          <span class="material-symbols-outlined text-rose-600 text-xl">error</span>
          <p class="text-xs font-bold">Analiz başlatılırken sunucu hatası oluştu. Lütfen tekrar deneyin.</p>
        `;
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
      }
    }
  };
}
