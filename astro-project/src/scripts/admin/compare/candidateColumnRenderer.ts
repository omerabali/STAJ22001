/**
 * Karşılaştırma sayfası — bir aday sütununu render eder (avatar, CV seçici, skor, güçlü/zayıf yönler, yetenekler).
 */
export function renderCandidateColumn(containerId: string, candidate: any, selectedCvId?: string): void {
  const container = document.getElementById(containerId);
  if (!container || !candidate) return;

  const cvs = candidate.cvs || [];
  let currentCv = cvs.find((c: any) => c.id === selectedCvId) || cvs[0] || null;

  // Analiz verisini alma
  const currentAnalysis = currentCv?.analysis || (currentCv?.analyses && currentCv.analyses[0]) || null;

  const initials = (candidate.name || candidate.email || '??').substring(0, 2).toUpperCase();
  const createdDate = candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';

  const score = currentAnalysis && currentAnalysis.atsScore !== null && currentAnalysis.atsScore !== undefined ? currentAnalysis.atsScore : null;
  const strengths = currentAnalysis?.strengths || [];
  const weaknesses = currentAnalysis?.weaknesses || [];
  const suggestions = currentAnalysis?.suggestions || currentAnalysis?.interviewQuestions || [];

  const scoreColorClass = score !== null && score >= 80 ? 'bg-emerald-600' : score !== null && score >= 60 ? 'bg-amber-500' : 'bg-rose-500';
  const scoreBadgeClass = score !== null && score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : score !== null && score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';

  const avatarHtml = candidate.avatarUrl
    ? `<div class="w-14 h-14 rounded-full border border-[#ddd9d3] bg-cover bg-center shrink-0" style="background-image: url('${candidate.avatarUrl}')"></div>`
    : `<div class="w-14 h-14 rounded-full bg-[#14422f]/10 text-[#14422f] border border-[#ddd9d3] flex items-center justify-center font-bold text-lg shrink-0">${initials}</div>`;

  // CV Seçim Dropdown HTML (Çoklu CV Varsa)
  let cvSelectorHtml = '';
  if (cvs.length > 1) {
    const optionsHtml = cvs.map((cvItem: any, idx: number) => {
      const isSel = currentCv && currentCv.id === cvItem.id ? 'selected' : '';
      const dateStr = cvItem.createdAt ? new Date(cvItem.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : '';
      const title = cvItem.fileName || `${idx + 1}. Özgeçmiş Belgesi`;
      return `<option value="${cvItem.id}" ${isSel}>📄 ${title} (${dateStr})</option>`;
    }).join('');

    cvSelectorHtml = `
      <div class="mt-3 pt-3 border-t border-[#ddd9d3]/60">
        <label class="text-[10px] font-bold text-[#14422f] uppercase tracking-wider block mb-1 flex items-center gap-1">
          <span class="material-symbols-outlined text-[13px]">folder_open</span> Karşılaştırılacak CV Seçin (${cvs.length} Belge Mevcut):
        </label>
        <div class="relative">
          <select 
            onchange="window.changeCompareCv('${containerId}', '${candidate.id}', this.value)"
            class="w-full appearance-none bg-[#faf9f5] border border-[#14422f]/30 rounded-[8px] px-3 py-1.5 pr-8 text-xs font-bold text-[#1b1c1a] focus:outline-none focus:ring-2 focus:ring-[#14422f]/20 focus:border-[#14422f] cursor-pointer shadow-2xs">
            ${optionsHtml}
          </select>
          <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[#14422f] text-[16px] pointer-events-none">unfold_more</span>
        </div>
      </div>
    `;
  } else if (currentCv) {
    cvSelectorHtml = `
      <div class="mt-3 pt-2.5 border-t border-[#ddd9d3]/60 flex items-center justify-between text-xs text-[#8a8580]">
        <span class="font-medium flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px] text-[#14422f]">description</span> 
          İncelenen CV: <strong class="text-[#1b1c1a] truncate max-w-[200px]">${currentCv.fileName || 'Özgeçmiş Belgesi'}</strong>
        </span>
        <span class="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Tek CV</span>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Header Info Card -->
    <div class="bg-white border border-[#ddd9d3] rounded-[12px] p-5 shadow-sm relative overflow-hidden">
      <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-[#14422f]"></div>
      <div class="flex justify-between items-start mb-2">
        <div class="flex items-center gap-3.5">
          ${avatarHtml}
          <div>
            <h3 class="font-bold text-[#1b1c1a] text-base">${candidate.name || 'İsimsiz Aday'}</h3>
            <p class="text-xs text-[#8a8580] font-medium mt-0.5">${candidate.email}</p>
          </div>
        </div>
      </div>

      ${cvSelectorHtml}

      <div class="flex items-center justify-between pt-3 mt-3 border-t border-[#ddd9d3]/60 text-xs text-[#8a8580]">
        <span>Kayıt Tarihi: <strong class="text-[#1b1c1a]">${createdDate}</strong></span>
        <a href="/admin/candidate-profile?id=${candidate.id}${currentCv?.id ? `&cvId=${currentCv.id}` : ''}&from=compare" class="text-[#14422f] hover:underline font-bold inline-flex items-center gap-1">
          Tam Profil <span class="material-symbols-outlined text-xs">arrow_forward</span>
        </a>
      </div>
    </div>

    <!-- ATS Match Score Card -->
    <div class="bg-white border border-[#ddd9d3] rounded-[12px] p-5 shadow-sm">
      <div class="flex justify-between items-center mb-3">
        <span class="text-xs font-bold text-[#8a8580] uppercase tracking-wider">ATS UYUM SKORU</span>
        ${score !== null
          ? `<span class="px-3 py-1 rounded-full text-xs font-bold border ${scoreBadgeClass}">%${score} ATS Skoru</span>`
          : `<span class="text-xs text-[#8a8580] italic font-medium">Analiz Henüz Tamamlanmadı</span>`}
      </div>
      ${score !== null ? `
        <div class="w-full bg-[#faf9f5] border border-[#ddd9d3] rounded-full h-3 overflow-hidden">
          <div class="h-full rounded-full ${scoreColorClass} transition-all duration-500" style="width: ${score}%"></div>
        </div>
      ` : ''}
    </div>

    <!-- Strengths Card -->
    <div class="bg-white border border-[#ddd9d3] rounded-[12px] p-5 shadow-sm flex flex-col gap-3">
      <h4 class="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
        <span class="material-symbols-outlined text-emerald-600 text-[18px]">thumb_up</span> Güçlü Yönler (Strengths)
      </h4>
      ${strengths.length > 0 ? `
        <ul class="space-y-2">${strengths.map((s: string) => `
          <li class="flex items-start gap-2 text-xs text-[#1b1c1a] leading-relaxed bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-lg">
            <span class="material-symbols-outlined text-emerald-600 text-[15px] shrink-0 mt-0.5">check_circle</span><span>${s}</span>
          </li>`).join('')}</ul>
      ` : `<p class="text-xs text-[#8a8580] italic">Güçlü yön verisi bulunamadı.</p>`}
    </div>

    <!-- Weaknesses Card -->
    <div class="bg-white border border-[#ddd9d3] rounded-[12px] p-5 shadow-sm flex flex-col gap-3">
      <h4 class="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-2">
        <span class="material-symbols-outlined text-rose-600 text-[18px]">build</span> Gelişime Açık Yönler (Gaps)
      </h4>
      ${weaknesses.length > 0 ? `
        <ul class="space-y-2">${weaknesses.map((w: string) => `
          <li class="flex items-start gap-2 text-xs text-[#1b1c1a] leading-relaxed bg-rose-50/60 border border-rose-100 p-2.5 rounded-lg">
            <span class="material-symbols-outlined text-rose-600 text-[15px] shrink-0 mt-0.5">warning</span><span>${w}</span>
          </li>`).join('')}</ul>
      ` : `<p class="text-xs text-[#8a8580] italic">Gelişim alanı verisi bulunamadı.</p>`}
    </div>

    <!-- Suggestions Card -->
    <div class="bg-white border border-[#ddd9d3] rounded-[12px] p-5 shadow-sm flex flex-col gap-3">
      <h4 class="text-xs font-bold text-[#14422f] uppercase tracking-wider flex items-center gap-2">
        <span class="material-symbols-outlined text-[#14422f] text-[18px]">quiz</span> Mülakat Önerileri & Sorular
      </h4>
      ${suggestions.length > 0 ? `
        <ul class="space-y-2">${suggestions.map((sug: any) => `
          <li class="flex items-start gap-2 text-xs text-[#1b1c1a] leading-relaxed bg-[#faf9f5] border border-[#ddd9d3] p-2.5 rounded-lg">
            <span class="material-symbols-outlined text-[#14422f] text-[15px] shrink-0 mt-0.5">help_outline</span><span>${typeof sug === 'string' ? sug : (sug.question || sug.topic || JSON.stringify(sug))}</span>
          </li>`).join('')}</ul>
      ` : `<p class="text-xs text-[#8a8580] italic">Mülakat önerisi bulunamadı.</p>`}
    </div>
  `;
}
