/**
 * 6. Admin CV List
 * Admin için tüm CV'leri çekme, sıralama ve tabloya yerleştirme (loadCVList).
 */
import { showChunks } from './chunkViewer.ts';

export function createAdminCvListLoader(state: {
  activeCvId: string | null;
  activeInterval: any;
  socket: any;
}) {
  return async function loadCVList(): Promise<void> {
    const tbody = document.getElementById('my-cvs-body');
    const countLabel = document.getElementById('cv-count-label');
    if (!tbody) return;
    try {
      const res = await fetch('/api/cv/list');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const cvs = data.cvs || [];
      if (countLabel) countLabel.textContent = `${cvs.length} kayıt`;
      if (cvs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-[#8a8580] font-medium text-sm">Henüz CV yüklenmedi.</td></tr>`;
        if (state.activeInterval) {
          clearInterval(state.activeInterval);
          state.activeInterval = null;
        }
        return;
      }
      let hasPending = false;
      tbody.innerHTML = '';
      cvs.forEach((cv: any) => {
        const analysis = cv.analyses?.[0];
        const status = analysis?.status ?? 'PENDING';
        if (status === 'PENDING' || status === 'PROCESSING') {
          hasPending = true;
          if (state.socket && cv.id) {
            state.socket.emit('join:cv', cv.id);
          }
        }
        const date = new Date(cv.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
        const badges: Record<string, string> = {
          PENDING:    `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Sırada</span>`,
          PROCESSING: `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>İşleniyor</span>`,
          COMPLETED:  `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Hazır</span>`,
          FAILED:     `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>Hata</span>`,
        };
        const statusBadge = badges[status] ?? '';
        const userText = cv.user ? (cv.user.name || cv.user.email) : 'Admin';
        const timeMs = cv.metadata?.processingTimeMs;
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
      if (hasPending && !state.activeInterval) state.activeInterval = setInterval(loadCVList, 3000);
      else if (!hasPending && state.activeInterval) { clearInterval(state.activeInterval); state.activeInterval = null; }
    } catch {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-rose-600 text-sm font-medium">Liste yüklenirken hata oluştu.</td></tr>`;
    }
  };
}
