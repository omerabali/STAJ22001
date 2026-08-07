/**
 * adminCvList.ts (Admin CV Yükleme Tablo Yöneticisi)
 * Görevi: Admin paneli CV yükleme sayfasındaki "Son Yüklenen CV'ler" tablosunu çeker ve günceller.
 * 3 saniyelik polling ile işlenme aşamasındaki CV'lerin durumunu canlı takip eder.
 */
import { showChunks } from './chunkViewer.ts';

let currentPage = 1;
const PAGE_SIZE = 10;
let cachedCvs: any[] = [];

export function createAdminCvListLoader(state: {
  activeCvId: string | null;
  activeInterval: any;
  socket: any;
}) {
  return async function loadCVList(): Promise<void> {
    const tbody = document.getElementById('my-cvs-body');
    const countLabel = document.getElementById('cv-count-label');
    const paginationContainer = document.getElementById('cv-pagination-container');
    if (!tbody) return;

    try {
      const res = await fetch('/api/cv/list');
      if (!res.ok) throw new Error();
      const data = await res.json();
      cachedCvs = data.cvs || [];

      if (countLabel) countLabel.textContent = `${cachedCvs.length} kayıt`;

      if (cachedCvs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-[#8a8580] font-medium text-sm">Henüz CV yüklenmedi.</td></tr>`;
        if (paginationContainer) paginationContainer.classList.add('hidden');
        if (state.activeInterval) {
          clearInterval(state.activeInterval);
          state.activeInterval = null;
        }
        return;
      }

      // Check pending
      let hasPending = false;
      cachedCvs.forEach((cv: any) => {
        const status = cv.analyses?.[0]?.status ?? 'PENDING';
        if ((status === 'PENDING' || status === 'PROCESSING') && state.socket && cv.id) {
          hasPending = true;
          state.socket.emit('join:cv', cv.id);
        }
      });

      renderTablePage(state);

      if (hasPending && !state.activeInterval) state.activeInterval = setInterval(loadCVList, 3000);
      else if (!hasPending && state.activeInterval) { clearInterval(state.activeInterval); state.activeInterval = null; }
    } catch {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-rose-600 text-sm font-medium">Liste yüklenirken hata oluştu.</td></tr>`;
    }
  };
}

function renderTablePage(state: any): void {
  const tbody = document.getElementById('my-cvs-body');
  const paginationContainer = document.getElementById('cv-pagination-container');
  const startEl = document.getElementById('pagination-start');
  const endEl = document.getElementById('pagination-end');
  const totalEl = document.getElementById('pagination-total');
  const prevBtn = document.getElementById('btn-prev-page') as HTMLButtonElement | null;
  const nextBtn = document.getElementById('btn-next-page') as HTMLButtonElement | null;
  const pageNumbersDiv = document.getElementById('pagination-page-numbers');

  if (!tbody) return;

  const totalItems = cachedCvs.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  if (currentPage > totalPages) currentPage = totalPages || 1;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const currentCvs = cachedCvs.slice(startIndex, endIndex);

  // Pagination UI Update
  if (paginationContainer) {
    if (totalItems > PAGE_SIZE) {
      paginationContainer.classList.remove('hidden');
    } else {
      paginationContainer.classList.add('hidden');
    }
  }

  if (startEl) startEl.textContent = totalItems > 0 ? (startIndex + 1).toString() : '0';
  if (endEl) endEl.textContent = endIndex.toString();
  if (totalEl) totalEl.textContent = totalItems.toString();

  if (prevBtn) {
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderTablePage(state);
      }
    };
  }

  if (nextBtn) {
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderTablePage(state);
      }
    };
  }

  if (pageNumbersDiv) {
    pageNumbersDiv.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `w-7 h-7 rounded-[6px] text-xs font-bold transition-all ${
        i === currentPage
          ? 'bg-[#14422f] text-white shadow-2xs'
          : 'bg-white text-[#1b1c1a] border border-[#ddd9d3] hover:bg-[#f5f4f0]'
      }`;
      pageBtn.textContent = i.toString();
      pageBtn.onclick = () => {
        currentPage = i;
        renderTablePage(state);
      };
      pageNumbersDiv.appendChild(pageBtn);
    }
  }

  // Render Rows
  tbody.innerHTML = '';
  currentCvs.forEach((cv: any) => {
    const analysis = cv.analyses?.[0];
    const status = analysis?.status ?? 'PENDING';
    const date = new Date(cv.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    const badges: Record<string, string> = {
      PENDING:    `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Sırada</span>`,
      PROCESSING: `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>İşleniyor</span>`,
      COMPLETED:  `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Hazır</span>`,
      FAILED:     `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Hata</span>`,
    };
    const statusBadge = badges[status] ?? '';
    const userText = cv.user ? (cv.user.name || cv.user.email) : 'Admin';
    const timeMs = cv.metadata?.processingTimeMs ?? cv.metadata?.totalTimeMs;
    const timeBadge = timeMs 
      ? `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-mono font-bold bg-[#faf9f5] text-[#14422f] border border-[#ddd9d3]"><span class="material-symbols-outlined text-[13px] text-amber-500">bolt</span>${(timeMs / 1000).toFixed(1)}s</span>` 
      : `<span class="text-[11px] text-[#8a8580] italic">-</span>`;

    const retryBtn = status === 'FAILED'
      ? `<button onclick="retryCV('${cv.id}')" class="p-1.5 rounded-[6px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors mr-1" title="Tekrar Dene">
           <span class="material-symbols-outlined text-[16px]">refresh</span>
         </button>`
      : '';
    const tr = document.createElement('tr');
    tr.className = `hover:bg-[#f5f4f0]/60 transition-colors cursor-pointer ${state.activeCvId === cv.id ? 'bg-[#f5f4f0]' : ''}`;
    tr.onclick = () => {
      state.activeCvId = cv.id;
      document.querySelectorAll('#my-cvs-body tr').forEach(r => r.classList.remove('bg-[#f5f4f0]'));
      tr.classList.add('bg-[#f5f4f0]');
      showChunks(cv.id, cv.fileName, state);
    };
    tr.innerHTML = `
      <td class="px-4 py-3"><div class="flex items-center gap-2.5"><span class="material-symbols-outlined text-red-500 text-[18px] shrink-0">picture_as_pdf</span><span class="text-xs font-bold text-[#1b1c1a] truncate max-w-[200px]">${cv.fileName}</span></div></td>
      <td class="px-4 py-3 text-[11px] text-[#8a8580] font-semibold truncate max-w-[130px]">${userText}</td>
      <td class="px-4 py-3 text-[11px] text-[#8a8580] font-medium whitespace-nowrap">${date}</td>
      <td class="px-4 py-3">${statusBadge}</td>
      <td class="px-4 py-3">${timeBadge}</td>
      <td class="px-4 py-3 text-right" onclick="event.stopPropagation()">
        ${retryBtn}
        <button onclick="deleteCV('${cv.id}')" class="p-1.5 rounded-[6px] text-[#8a8580] hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Sil">
          <span class="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
