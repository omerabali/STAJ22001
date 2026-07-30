/**
 * CV Listesini Yükleme Modülü
 * API'den CV + analiz verisi çeker, sol paneli render eder.
 * PENDING/PROCESSING durumlarında 3 saniyelik otomatik yenileme yapar.
 */
import { analysesState } from './analysesState';
import { showAnalysisDetails } from './analysisRenderer';

export function loadCVList(): void {
  const fetcher = async () => {
    const res = await fetch('/api/cv/list');
    if (!res.ok) throw new Error('Fetch CV list error');
    return res.json();
  };

  const render = (data: any) => {
    const tbody = document.getElementById('analyses-cvs-body') as HTMLElement;
    if (!tbody) return;

    if (!data.cvs || data.cvs.length === 0) {
      tbody.innerHTML = `
        <div class="text-center py-12 text-[#8a8580] font-medium text-xs">Henüz yüklenmiş bir CV bulunamadı.</div>
      `;
      return;
    }

    tbody.innerHTML = '';
    let hasPendingOrProcessing = false;

    data.cvs.forEach((cv: any) => {
      const latestAnalysis = cv.analyses && cv.analyses[0];
      const status = latestAnalysis ? latestAnalysis.status : 'PENDING';
      if (status === 'PENDING' || status === 'PROCESSING') hasPendingOrProcessing = true;

      const dateStr = new Date(cv.createdAt).toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      let statusBadge = '';
      if (status === 'PENDING') {
        statusBadge = `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span> Sırada
          </span>`;
      } else if (status === 'PROCESSING') {
        statusBadge = `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-spin"></span> İşleniyor
          </span>`;
      } else if (status === 'COMPLETED') {
        statusBadge = `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Hazır
          </span>`;
      } else {
        statusBadge = `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Hata
          </span>`;
      }

      const isSelected = analysesState.selectedCvId === cv.id;
      const div = document.createElement('div');
      div.className = `group grid grid-cols-12 items-center p-4 border rounded-[10px] cursor-pointer transition-colors shadow-sm gap-2 ${
        isSelected ? 'bg-[#14422f]/5 border-[#14422f]' : 'bg-white border-[#ddd9d3] hover:bg-[#faf9f5]'
      }`;

      div.onclick = () => {
        analysesState.selectedCvId = cv.id;
        const items = tbody.querySelectorAll('.group');
        items.forEach(item => {
          item.classList.remove('bg-[#14422f]/5', 'border-[#14422f]');
          item.classList.add('bg-white', 'border-[#ddd9d3]');
        });
        div.classList.add('bg-[#14422f]/5', 'border-[#14422f]');
        div.classList.remove('bg-white', 'border-[#ddd9d3]');
        showAnalysisDetails(cv, latestAnalysis);
      };

      div.innerHTML = `
        <div class="col-span-5 flex items-center gap-3 min-w-0">
          <span class="material-symbols-outlined text-red-600 shrink-0">picture_as_pdf</span>
          <p class="font-bold text-sm text-[#1b1c1a] truncate" title="${cv.fileName}">${cv.fileName}</p>
        </div>
        <div class="col-span-3 text-xs text-[#8a8580] font-medium whitespace-nowrap pl-2">${dateStr}</div>
        <div class="col-span-3 flex items-center justify-start">${statusBadge}</div>
        <div class="col-span-1 flex justify-end" onclick="event.stopPropagation();">
          <button class="text-[#8a8580] hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" onclick="deleteCV('${cv.id}')" title="Sil">
            <span class="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      `;
      tbody.appendChild(div);

      if (analysesState.selectedCvId === cv.id) showAnalysisDetails(cv, latestAnalysis);
    });

    if (hasPendingOrProcessing) {
      if (!analysesState.activeInterval) {
        analysesState.activeInterval = setInterval(loadCVList, 3000);
      }
    } else {
      if (analysesState.activeInterval) {
        clearInterval(analysesState.activeInterval);
        analysesState.activeInterval = null;
      }
      // Analiz tamamlandığında "Yeniden Analiz Et" butonunu normale döndür
      const btn = document.getElementById('reanalyze-candidate-btn') as HTMLButtonElement | null;
      if (btn && btn.disabled) {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined text-sm">refresh</span> Yeniden Analiz Et`;
      }
    }
  };

  const staleTime = analysesState.activeInterval ? 0 : 30000;

  if ((window as any).__swrCache) {
    (window as any).__swrCache.query('user-cvs', fetcher, render, staleTime);
  } else {
    fetcher().then(render).catch((err: any) => console.error('CV List load failed:', err));
  }
}
