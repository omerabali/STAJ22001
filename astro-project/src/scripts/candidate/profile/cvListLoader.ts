/**
 * cvListLoader.ts (Profil CV Listesi Yükleme Yöneticisi)
 * Görevi: Profil sayfasının alt tarafındaki "Özgeçmişlerim" tablosuna verileri çeker ve doldurur.
 * İşlemde olan bir CV varsa 3 saniyede bir polling ile durumunu canlı günceller.
 */
import { deleteCV } from './deleteCv';
import { showAnalysisDetails } from './analysisRenderer';

export function createCvListLoader(state: {
  selectedCvId: string | null;
  activeInterval: any;
}) {
  return async function loadCVList() {
    const fetcher = async () => {
      const res = await fetch('/api/cv/list');
      if (!res.ok) throw new Error("Fetch CV list error");
      return res.json();
    };

    const render = (data: any) => {
      const tbody = document.getElementById('profile-cvs-body');
      if (!tbody) return;

      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const last3DaysCvs = (data.cvs || []).filter((cv: any) => {
        const cvDate = new Date(cv.createdAt).getTime();
        return (now - cvDate) <= THREE_DAYS_MS;
      });

      if (last3DaysCvs.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="px-6 py-8 text-center text-[#8a8580] font-medium">Son 3 gün içerisinde yüklenen CV bulunmamaktadır.</td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = '';
      let hasPendingOrProcessing = false;

      last3DaysCvs.forEach((cv: any) => {
        const latestAnalysis = cv.analyses && cv.analyses[0];
        const status = latestAnalysis ? latestAnalysis.status : 'PENDING';
        if (status === 'PENDING' || status === 'PROCESSING') {
          hasPendingOrProcessing = true;
        }
      });

      const cvsToShow = last3DaysCvs.slice(0, 3);

      cvsToShow.forEach((cv: any) => {
        const latestAnalysis = cv.analyses && cv.analyses[0];
        const status = latestAnalysis ? latestAnalysis.status : 'PENDING';
        const dateStr = new Date(cv.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
        
        let statusBadge = '';
        if (status === 'PENDING') {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span> Sırada
            </span>
          `;
        } else if (status === 'PROCESSING') {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-spin"></span> İşleniyor
            </span>
          `;
        } else if (status === 'COMPLETED') {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Hazır
            </span>
          `;
        } else {
          statusBadge = `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Hata
            </span>
          `;
        }

        const scoreStr = latestAnalysis && latestAnalysis.atsScore !== null 
          ? `<span class="font-bold text-emerald-700">%${latestAnalysis.atsScore} ATS Skoru</span>` 
          : `<span class="text-[#8a8580]">-</span>`;

        const timeMs = cv.metadata?.processingTimeMs ?? cv.metadata?.totalTimeMs;
        const timeBadge = timeMs 
          ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-mono font-bold bg-[#faf9f5] text-[#14422f] border border-[#ddd9d3]"><span class="material-symbols-outlined text-[13px] text-amber-500">bolt</span>${(timeMs / 1000).toFixed(1)}s</span>` 
          : `<span class="text-xs text-[#8a8580] italic">-</span>`;

        const tr = document.createElement('tr');
        tr.className = `hover:bg-[#f5f4f0]/60 transition-all group cursor-pointer ${state.selectedCvId === cv.id ? 'bg-[#f5f4f0]' : ''}`;
        tr.onclick = () => {
          state.selectedCvId = cv.id;
          const rows = tbody.querySelectorAll('tr');
          rows.forEach(r => r.classList.remove('bg-[#f5f4f0]'));
          tr.classList.add('bg-[#f5f4f0]');
          showAnalysisDetails(cv, latestAnalysis);
        };

        tr.innerHTML = `
          <td class="py-3.5 px-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-rose-600 text-[18px] shrink-0">picture_as_pdf</span>
              <span class="font-bold text-[#1b1c1a] truncate max-w-[160px] text-xs">${cv.fileName}</span>
            </div>
          </td>
          <td class="py-3.5 px-2 text-[#8a8580] font-medium text-xs">${dateStr}</td>
          <td class="py-3.5 px-2">${statusBadge}</td>
          <td class="py-3.5 px-2 text-center">${timeBadge}</td>
          <td class="py-3.5 px-2 text-center text-xs font-bold">${scoreStr}</td>
          <td class="py-3.5 px-2 text-right" onclick="event.stopPropagation();">
            <button class="text-[#8a8580] hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors" onclick="deleteCV('${cv.id}')" title="Sil">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </td>
        `;
        tbody.appendChild(tr);

        if (state.selectedCvId === cv.id) {
          showAnalysisDetails(cv, latestAnalysis);
        }
      });

      if (hasPendingOrProcessing) {
        if (!state.activeInterval) {
          state.activeInterval = setInterval(loadCVList, 3000);
        }
      } else {
        if (state.activeInterval) {
          clearInterval(state.activeInterval);
          state.activeInterval = null;
        }
      }
    };

    const staleTime = state.activeInterval ? 0 : 30000;

    if ((window as any).__swrCache) {
      (window as any).__swrCache.query('user-cvs', fetcher, render, staleTime);
    } else {
      fetcher().then(render).catch(err => console.error("CV List load failed:", err));
    }
  };
}
