/**
 * 5. Directory Search
 * Gelişmiş Filtreleme (Hard Requirement) motoru ve aday arama filtresi (renderCandidates).
 */
import { getInitials, renderSkills } from './helperFunctions.ts';

export function renderCandidates(allUsersData: any[], filterState: { currentFilter: string }): void {
  const container = document.getElementById('candidates-container');
  if (!container) return;

  const searchInput = document.getElementById('candidate-search-input') as HTMLInputElement;
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const filtered = allUsersData.filter(user => {
    const cv = user.latestCv || (user.cvs && user.cvs[0]);
    const analysis = cv?.analysis || (cv?.analyses && cv.analyses[0]);
    const status = analysis ? analysis.status : (cv ? 'PENDING' : 'NO_CV');

    // Filter pill matching: all | completed | processing | pending
    if (filterState.currentFilter === 'completed' && status !== 'COMPLETED') return false;
    if (filterState.currentFilter === 'processing' && status !== 'PROCESSING') return false;
    if (filterState.currentFilter === 'pending' && status !== 'PENDING' && status !== 'NO_CV') return false;

    if (searchTerm) {
      const nameMatch = (user.name || '').toLowerCase().includes(searchTerm);
      const emailMatch = (user.email || '').toLowerCase().includes(searchTerm);
      const roleMatch = (analysis?.role || '').toLowerCase().includes(searchTerm);
      const skillsMatch = (analysis?.skills || []).some((s: string) => s.toLowerCase().includes(searchTerm));
      const fileMatch = (cv?.fileName || '').toLowerCase().includes(searchTerm);
      return nameMatch || emailMatch || roleMatch || skillsMatch || fileMatch;
    }

    return true;
  });

  const countBadge = document.getElementById('result-count-badge');
  if (countBadge) countBadge.textContent = `${filtered.length} Aday Gösteriliyor`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-white border border-[#ddd9d3] rounded-[10px] p-12 text-center shadow-xs">
        <span class="material-symbols-outlined text-4xl text-[#8a8580] mb-2">person_search</span>
        <h4 class="text-sm font-bold text-[#1b1c1a]">Aday Bulunamadı</h4>
        <p class="text-xs text-[#8a8580] mt-1">Arama kriterlerinize uyan kullanıcı bulunamadı.</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(user => {
    const cv = user.latestCv || (user.cvs && user.cvs[0]);
    const analysis = cv?.analysis || (cv?.analyses && cv.analyses[0]);
    const score = analysis?.atsScore;
    const skills = analysis?.skills || [];
    const role = analysis?.role || 'Aday';
    const initials = getInitials(user.name, user.email);
    const avatarUrl = user.avatarUrl;

    const avatarHtml = avatarUrl
      ? `<img src="${avatarUrl}" alt="${user.name || user.email}" class="w-10 h-10 rounded-full object-cover shrink-0 border border-[#ddd9d3]" />`
      : `<div class="w-10 h-10 rounded-full bg-[#14422f] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">${initials}</div>`;

    const scoreBadge = score !== undefined && score !== null
      ? `<div class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">%${score} ATS</div>`
      : `<div class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-50 text-gray-500 border border-gray-200">Analiz Yok</div>`;

    const safeName = (user.name || user.email || 'Aday').replace(/'/g, "\\'");

    return `
      <div class="bg-white border border-[#ddd9d3] rounded-[12px] p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group">
        <div>
          <div class="flex items-start justify-between gap-3 mb-4">
            <div class="flex items-center gap-3 min-w-0">
              ${avatarHtml}
              <div class="min-w-0">
                <h4 class="font-bold text-[#1b1c1a] text-sm group-hover:text-[#14422f] transition-colors truncate" title="${user.name || 'İsimsiz Aday'}">${user.name || 'İsimsiz Aday'}</h4>
                <p class="text-[11px] text-[#8a8580] font-medium truncate" title="${user.email}">${user.email}</p>
              </div>
            </div>
            ${scoreBadge}
          </div>

          <div class="space-y-3 mb-4">
            <div class="flex items-center gap-2 text-xs text-[#8a8580] font-medium">
              <span class="material-symbols-outlined text-[16px]">work</span>
              <span>${role}</span>
            </div>
            <div class="flex flex-wrap gap-1.5 max-h-[60px] overflow-hidden">
              ${renderSkills(skills)}
            </div>
          </div>
        </div>

        <div class="pt-3 border-t border-[#ddd9d3]/60 flex items-center justify-between">
          <button 
            onclick="window.toggleCompareCandidate('${user.id}', '${safeName}', event)"
            data-compare-id="${user.id}"
            class="px-3 py-1.5 rounded-[6px] border border-[#ddd9d3] text-xs font-semibold text-[#1b1c1a] hover:bg-[#f5f4f0] transition-colors flex items-center gap-1 cursor-pointer">
            <span class="material-symbols-outlined text-xs">compare_arrows</span> Karşılaştır
          </button>
          <a href="/admin/candidate-profile?id=${user.id}${cv?.id ? `&cvId=${cv.id}` : ''}&from=basic" class="text-xs font-bold text-[#14422f] hover:underline flex items-center gap-1">
            Profili Gör <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}
