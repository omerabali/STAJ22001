/**
 * liveStateUi.ts (Canlı İşlem Akışı Arayüz Yöneticisi)
 * Görevi: Yeni CV yüklendiği anda sağ paneli "Canlı İşlem Akışı" moduna geçirir.
 * Adım göstergelerini (Adım 1/4) ve canlı zaman çizelgesi (timeline) alanını ekranda hazırlar.
 */
export function showLiveProcessingState(fileName: string): void {
  const noState = document.getElementById('no-analysis-state');
  const activeState = document.getElementById('active-analysis-state');
  if (!noState || !activeState) return;

  noState.classList.add('hidden');
  activeState.classList.remove('hidden');

  const cvNameEl = document.getElementById('analysis-cv-name');
  if (cvNameEl) cvNameEl.textContent = fileName;

  const statusIndicator = document.getElementById('analysis-status-indicator');
  const contentArea = document.getElementById('analysis-content-area');

  if (statusIndicator) {
    statusIndicator.innerHTML = `<span class="material-symbols-outlined text-blue-600 text-3xl animate-spin">progress_activity</span>`;
  }

  if (contentArea) {
    contentArea.innerHTML = `
      <div class="flex flex-col h-full">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-[#14422f] animate-pulse"></span>
            <span class="text-xs font-bold text-[#1b1c1a]">Canlı İşlem Akışı</span>
          </div>
          <span id="profile-step-badge" class="bg-[#14422f]/10 text-[#14422f] px-2.5 py-0.5 rounded-full text-[10px] font-bold">Adım 1 / 4</span>
        </div>

        <div class="bg-[#faf9f5] border border-[#ddd9d3] rounded-lg px-4 py-3 mb-4">
          <p class="text-xs font-bold text-[#1b1c1a] flex items-center gap-2" id="profile-step-title">
            <span class="material-symbols-outlined text-[16px] text-[#14422f] animate-spin">progress_activity</span>
            Analiz Sıraya Alındı...
          </p>
        </div>

        <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <div id="live-activity-timeline" class="space-y-0 pl-1"></div>
        </div>
      </div>
    `;
  }
}
