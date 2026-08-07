/**
 * searchRenderer.ts (Arama Kartı HTML Şablon Çizici)
 * Görevi: Arama sonuçlarında listelenen her bir adayın kartını, profil fotoğrafını,
 * eşleşme rozetini, son deneyimlerini ve eylem butonlarını (Detay Gör, Karşılaştır) üreten HTML şablon motorudur.
 */

export interface CandidateSearchResult {
  userId: string;
  cvId: string;
  candidateName: string;
  candidateEmail: string;
  candidateAvatarUrl?: string;
  avatarUrl?: string;
  score?: number;
  finalScore?: number;
  vectorScore?: number;
  gptScore?: number;
  matchExplanation?: string;
  matchedChunks?: any[];
}

export function renderCandidateCardHtml(c: CandidateSearchResult): string {
  const initials = c.candidateName
    ? c.candidateName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : (c.candidateEmail ? c.candidateEmail.substring(0, 2).toUpperCase() : 'AD');

  // score veya finalScore oku
  const score = Math.round(c.score !== undefined ? c.score : (c.finalScore !== undefined ? c.finalScore : 0));
  const colorClass = score >= 70 ? 'bg-emerald-600' : score >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  const badgeClass = score >= 70 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : score >= 40 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-rose-50 text-rose-800 border border-rose-200';

  let matchExplanationHtml = '';
  if (c.matchExplanation || (c.matchedChunks && c.matchedChunks.length > 0)) {
    const vectorScoreText = c.vectorScore ? `%${Math.round(c.vectorScore)}` : 'N/A';
    const gptScoreText = c.gptScore !== undefined && c.gptScore !== null ? `%${c.gptScore}` : 'N/A';

    matchExplanationHtml = `
      <div class="bg-[#faf9f5] border border-[#ddd9d3] rounded-lg p-4 flex flex-col gap-2">
        <div class="flex items-center gap-2 text-xs font-bold text-[#14422f]">
          <span class="material-symbols-outlined text-[16px] text-amber-600">auto_awesome</span>
          AI Uyum Analizi & Gerekçe:
        </div>
        <p class="text-xs text-[#1b1c1a] font-medium leading-relaxed">${c.matchExplanation || 'Aday kriterlere uygun yetkinlikler sunmaktadır.'}</p>
        <div class="mt-1 pt-2 border-t border-[#ddd9d3]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-[#8a8580]">
          <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-[#14422f]"></span>Semantik Eşleşen Aday</span>
          <div>
            ${c.gptScore !== undefined && c.gptScore !== null ? `<span>Yapay Zeka Kararı: <span class="text-[#14422f] font-bold">${c.gptScore > 70 ? `%${c.gptScore} (Şartlar Sağlandı)` : c.gptScore === 0 ? `%0 (Kriter Sağlanmadı)` : `%${c.gptScore}`}</span></span>` : ''}
          </div>
        </div>
      </div>
    `;
  } else {
    matchExplanationHtml = `
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-xs mt-3">
        <span class="material-symbols-outlined text-[18px] text-amber-600 flex-shrink-0">warning</span>
        <p class="font-body-sm font-medium">Adayın CV içerikleri sorgu kriterleri ile eşleştiriliyor.</p>
      </div>
    `;
  }

  const safeName = (c.candidateName || 'İsimsiz').replace(/"/g, '&quot;');
  const escapedName = (c.candidateName || 'İsimsiz').replace(/`/g, '\\`').replace(/'/g, "\\'");

  return `
    <div class="bg-white border border-[#ddd9d3] rounded-[10px] p-6 hover:shadow-md transition-shadow flex flex-col gap-4 shadow-sm relative overflow-hidden">
      <div class="flex justify-between items-start">
        <div class="flex gap-4">
          ${c.candidateAvatarUrl || c.avatarUrl
            ? `<img src="${c.candidateAvatarUrl || c.avatarUrl}" alt="${c.candidateName || 'Aday'}" class="w-12 h-12 rounded-full object-cover shrink-0 border border-[#ddd9d3]" />`
            : `<div class="w-12 h-12 rounded-full bg-[#14422f]/10 text-[#14422f] flex items-center justify-center font-bold text-lg flex-shrink-0">${initials}</div>`
          }
          <div>
            <h4 class="font-bold text-[#1b1c1a]">${c.candidateName || 'İsimsiz'}</h4>
            <p class="text-[#8a8580] text-sm mt-0.5 font-medium">${c.candidateEmail}</p>
          </div>
        </div>
        
        <div class="flex flex-col items-end gap-1">
          <div class="flex items-center gap-1 ${badgeClass} px-2.5 py-1 rounded-[6px] font-bold text-xs">
            <span class="material-symbols-outlined text-[14px]">bolt</span>
            %${score} AI Arama Uyumu
          </div>
        </div>
      </div>

      <div class="w-full bg-[#faf9f5] border border-[#ddd9d3] rounded-full h-2.5 overflow-hidden">
        <div class="h-full rounded-full ${colorClass}" style="width: ${score}%"></div>
      </div>

      ${matchExplanationHtml}

      <div class="flex justify-between items-center mt-2 pt-4 border-t border-[#ddd9d3]">
        <div class="flex items-center gap-1.5 text-[#8a8580] text-xs font-semibold">
          <span class="material-symbols-outlined text-[14px]">pin</span>
          ID: ${c.cvId ? c.cvId.substring(0, 8) : ''}...
        </div>
        <div class="flex items-center gap-2">
          <button 
            data-compare-id="${c.userId}"
            data-compare-name="${safeName}"
            onclick="toggleCompareCandidate('${c.userId}', \`${escapedName}\`, event)"
            class="px-3 py-1.5 rounded-[6px] border border-[#ddd9d3] text-xs font-semibold text-[#1b1c1a] hover:bg-[#faf9f5] transition-colors flex items-center gap-1 cursor-pointer">
            <span class="material-symbols-outlined text-xs">compare_arrows</span> Karşılaştır
          </button>
          <a href="/admin/candidate-profile?id=${c.userId}${c.cvId ? `&cvId=${c.cvId}` : ''}&from=semantic" class="px-3 py-1.5 rounded-[6px] bg-[#14422f] hover:bg-[#103425] text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer">
            Profili Gör <span class="material-symbols-outlined text-xs">arrow_forward</span>
          </a>
        </div>
      </div>
    </div>
  `;
}
