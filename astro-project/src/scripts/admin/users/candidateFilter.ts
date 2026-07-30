import { usersState } from './usersState';
import { renderInitialUsersView, renderUsersPage } from './userPagination';

/**
 * Aday filtreleme tablosu render — min ATS, isim, email, tarih sıralaması.
 */
export function applyCandidateFilters(page = 1): void {
  const tbody = document.getElementById('candidate-filter-tbody');
  const tableContainer = document.getElementById('candidate-filter-table-container');
  const countBadge = document.getElementById('candidate-filter-count-badge');
  if (!tbody || !tableContainer) return;

  const minAtsVal = (document.getElementById('filter-min-ats') as HTMLSelectElement)?.value || '';
  const minAts = (minAtsVal !== '' && minAtsVal !== 'ALL') ? parseInt(minAtsVal, 10) : -1;
  const sortDate = (document.getElementById('filter-sort-date') as HTMLSelectElement)?.value || 'desc';
  const nameQuery = ((document.getElementById('filter-candidate-name') as HTMLInputElement)?.value || '').toLowerCase().trim();
  const emailQuery = ((document.getElementById('filter-candidate-email') as HTMLInputElement)?.value || '').toLowerCase().trim();

  const hasActiveFilter = minAts >= 0 || nameQuery !== '' || emailQuery !== '';

  if (!hasActiveFilter) {
    tableContainer.classList.add('hidden');
    return;
  }

  tableContainer.classList.remove('hidden');
  let list = [...usersState.rawCandidateData];

  if (minAts >= 0) {
    list = list.filter((c: any) => {
      const score = (c.atsScore !== undefined && c.atsScore !== null) ? c.atsScore : 0;
      return score >= minAts;
    });
  }

  if (nameQuery) {
    list = list.filter((c: any) => {
      const name = (c.name || c.isim || '').toLowerCase();
      const fileName = (c.latestCvName || '').toLowerCase();
      return name.includes(nameQuery) || fileName.includes(nameQuery);
    });
  }

  if (emailQuery) {
    list = list.filter((c: any) => (c.email || '').toLowerCase().includes(emailQuery));
  }

  list.sort((a: any, b: any) => {
    const dateA = new Date(a.createdAt || a.yuklemeTarihi || 0).getTime();
    const dateB = new Date(b.createdAt || b.yuklemeTarihi || 0).getTime();
    return sortDate === 'asc' ? dateA - dateB : dateB - dateA;
  });

  usersState.candidateFilteredList = list;
  if (countBadge) countBadge.textContent = `🎯 Filtreleme Sonuçları (${list.length} Aday Bulundu)`;

  renderCandidateFilterPage(page);
}

export function renderCandidateFilterPage(page = 1): void {
  usersState.candidateFilterCurrentPage = page;
  const tbody = document.getElementById('candidate-filter-tbody');
  const infoEl = document.getElementById('candidate-filter-pagination-info');
  const controlsEl = document.getElementById('candidate-filter-pagination-controls');
  if (!tbody) return;

  const list = usersState.candidateFilteredList;
  const limit = 10;
  const total = list.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const displayed = list.slice(startIndex, startIndex + limit);

  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-[#8a8580] font-medium">Filtrelere uygun aday bulunamadı.</td></tr>';
    if (infoEl) infoEl.textContent = 'Gösterilen: 0 / Toplam 0';
    if (controlsEl) controlsEl.innerHTML = '';
    return;
  }

  tbody.innerHTML = displayed.map((cand: any) => {
    const rawDate = cand.yuklemeTarihi || cand.createdAt;
    const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('tr-TR') : '-';
    const candName = cand.isim || cand.name || cand.email || 'Aday';
    const candId = cand.userId || cand.id;
    const initials = candName.substring(0, 2).toUpperCase();
    const isChecked = usersState.selectedUserIds.has(candId);

    return `
      <tr class="hover:bg-[#f5f4f0]/40 transition-colors duration-150 group">
        <td class="p-4">
          <input type="checkbox" value="${candId}" ${isChecked ? 'checked' : ''} onchange="toggleSelectUser('${candId}', this.checked)" class="candidate-filter-checkbox rounded border-[#ddd9d3] text-[#14422f] focus:ring-[#14422f]" />
        </td>
        <td class="p-4">
          <div class="flex items-center gap-3">
            ${cand.avatarUrl
              ? `<img src="${cand.avatarUrl}" alt="${candName}" class="w-8 h-8 rounded-full object-cover shrink-0 border border-[#ddd9d3]" />`
              : `<div class="w-8 h-8 rounded-full bg-[#14422f]/10 text-[#14422f] flex items-center justify-center font-bold text-xs shrink-0">${initials}</div>`
            }
            <span class="font-bold text-[#1b1c1a] text-sm">${candName}</span>
          </div>
        </td>
        <td class="p-4 text-[#8a8580] font-medium">${cand.email || '-'}</td>
        <td class="p-4 text-[#8a8580] font-medium">${dateStr}</td>
        <td class="p-4 text-right">
          <a href="/admin/candidate-profile?id=${candId}&cvId=${cand.cvId || ''}&from=users" class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#ddd9d3] rounded-[8px] bg-[#14422f] text-white hover:bg-[#103425] text-xs font-bold transition-all shadow-xs">
            <span class="material-symbols-outlined text-sm">visibility</span> Profili Gör
          </a>
        </td>
      </tr>
    `;
  }).join('');

  if (infoEl) infoEl.textContent = `Gösterilen: ${startIndex + 1} - ${Math.min(startIndex + limit, total)} / Toplam ${total}`;

  if (controlsEl) {
    if (totalPages <= 1) {
      controlsEl.innerHTML = '';
    } else {
      let html = `<button ${page <= 1 ? 'disabled' : ''} onclick="renderCandidateFilterPage(${page - 1})" class="disabled:opacity-40 px-3 py-1.5 border border-[#ddd9d3] rounded-[6px] text-xs font-semibold bg-white hover:bg-[#faf9f5]">Önceki</button>`;
      for (let p = 1; p <= totalPages; p++) {
        html += p === page
          ? `<span class="px-3 py-1.5 bg-[#14422f] text-white rounded-[6px] text-xs font-bold">${p}</span>`
          : `<button onclick="renderCandidateFilterPage(${p})" class="px-3 py-1.5 border border-[#ddd9d3] rounded-[6px] text-xs font-semibold bg-white hover:bg-[#faf9f5]">${p}</button>`;
      }
      html += `<button ${page >= totalPages ? 'disabled' : ''} onclick="renderCandidateFilterPage(${page + 1})" class="disabled:opacity-40 px-3 py-1.5 border border-[#ddd9d3] rounded-[6px] text-xs font-semibold bg-white hover:bg-[#faf9f5]">Sonraki</button>`;
      controlsEl.innerHTML = html;
    }
  }
}

export function initCandidateFilterGlobals(): void {
  (window as any).applyCandidateFilters = applyCandidateFilters;
  (window as any).renderCandidateFilterPage = renderCandidateFilterPage;

  (window as any).clearCandidateFilters = function (): void {
    const atsEl = document.getElementById('filter-min-ats') as HTMLSelectElement;
    const sortEl = document.getElementById('filter-sort-date') as HTMLSelectElement;
    const nameEl = document.getElementById('filter-candidate-name') as HTMLInputElement;
    const emailEl = document.getElementById('filter-candidate-email') as HTMLInputElement;

    if (atsEl) atsEl.selectedIndex = 0;
    if (sortEl) sortEl.value = 'desc';
    if (nameEl) nameEl.value = '';
    if (emailEl) emailEl.value = '';

    const container = document.getElementById('candidate-filter-table-container');
    if (container) container.classList.add('hidden');
  };
}
