/**
 * cvDetailsRenderer.ts (Admin Aday CV Detay Çizici)
 * Görevi: Admin aday inceleme ekranında seçilen CV'nin ATS uyum skorunu,
 * yapay zeka SWOT analizini (Güçlü/Eksik yönler), mülakat sorularını ve önerilerini detay paneline çizer.
 */
import { candProfileState } from './candProfileState';
export function renderSelectedCvDetails(cvId: string): void {
  const selectedCv = candProfileState.candidateCvs.find((c: any) => c.id === cvId) || candProfileState.candidateCvs[0];
  const latestAnalysis = selectedCv && selectedCv.analyses && selectedCv.analyses[0];

  const statusEl = document.getElementById('profile-status-badge');
  const atsEl = document.getElementById('profile-ats-score');
  const subtitleEl = document.getElementById('analysis-file-subtitle');
  const viewPdfBtn = document.getElementById('view-pdf-btn') as HTMLAnchorElement | null;
  const liveBanner = document.getElementById('live-processing-banner');

  if (selectedCv && selectedCv.id) {
    const pdfUrl = `/api/cv/${selectedCv.id}/download`;
    if (viewPdfBtn) { 
      viewPdfBtn.href = pdfUrl; 
      viewPdfBtn.classList.remove('hidden'); 
      viewPdfBtn.classList.add('inline-flex'); 
    }
  }

  if (!selectedCv) {
    if (subtitleEl) subtitleEl.textContent = 'Özgeçmiş Bulunmuyor';
    if (statusEl) {
      statusEl.className = 'px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200';
      statusEl.textContent = 'CV Yok';
    }
    if (atsEl) atsEl.textContent = '-%';

    const noCvHtml = `
      <div class="p-6 bg-amber-50/60 border border-amber-200/80 rounded-xl text-center space-y-2">
        <span class="material-symbols-outlined text-amber-600 text-3xl">info</span>
        <h4 class="text-xs font-bold text-amber-900">Adayın Henüz Yüklenmiş Bir CV'si Bulunmuyor</h4>
        <p class="text-[11px] text-amber-700 font-medium">Bu aday henüz sistemlerimize özgeçmiş yüklememiştir. Analiz yapılabilmesi için adayın öncelikle CV yüklemesi gereklidir.</p>
      </div>`;

    const strContainer = document.getElementById('strengths-container');
    const weakContainer = document.getElementById('weaknesses-container');
    const sugContainer = document.getElementById('suggestions-container');
    if (strContainer) strContainer.innerHTML = noCvHtml;
    if (weakContainer) weakContainer.innerHTML = noCvHtml;
    if (sugContainer) sugContainer.innerHTML = noCvHtml;
    return;
  }

  const score = (latestAnalysis && latestAnalysis.atsScore !== undefined && latestAnalysis.atsScore !== null) ? latestAnalysis.atsScore : 0;
  if (atsEl) atsEl.textContent = isProcessing ? '...' : `%${score}`;

  // GÜÇLÜ YÖNLER
  const strContainer = document.getElementById('strengths-container');
  const strengths = latestAnalysis ? latestAnalysis.strengths : [];
  if (strContainer) {
    if (isProcessing) {
      strContainer.innerHTML = `
        <div class="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3 animate-pulse text-xs text-blue-800 font-medium">
          <span class="material-symbols-outlined text-blue-600 animate-spin text-sm">sync</span>
          <span>Yapay zeka CV'deki güçlü yönleri ve yetkinlikleri çıkarıyor...</span>
        </div>`;
    } else {
      strContainer.innerHTML = (Array.isArray(strengths) && strengths.length > 0)
        ? strengths.map((s: any) => {
            const text = typeof s === 'object' && s !== null ? (s.text || JSON.stringify(s)) : String(s);
            const confBadge = (typeof s === 'object' && s !== null && s.confidence === 'high')
              ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">Yüksek Güven</span>`
              : '';
            return `
              <div class="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-start gap-2.5 text-xs font-medium text-[#1b1c1a] shadow-2xs">
                <span class="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">check_circle</span>
                <span class="leading-relaxed flex-1">${text}</span>
                ${confBadge}
              </div>`;
          }).join('')
        : '<p class="text-xs text-[#8a8580] italic">Güçlü yön verisi bulunmuyor.</p>';
    }
  }

  // EKSİK YÖNLER
  const weakContainer = document.getElementById('weaknesses-container');
  const weaknesses = latestAnalysis ? latestAnalysis.weaknesses : [];
  if (weakContainer) {
    if (isProcessing) {
      weakContainer.innerHTML = `
        <div class="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3 animate-pulse text-xs text-blue-800 font-medium">
          <span class="material-symbols-outlined text-blue-600 animate-spin text-sm">sync</span>
          <span>Yapay zeka gelişim alanlarını ve eksiklikleri tespit ediyor...</span>
        </div>`;
    } else {
      weakContainer.innerHTML = (Array.isArray(weaknesses) && weaknesses.length > 0)
        ? weaknesses.map((w: any) => {
            const text = typeof w === 'object' && w !== null ? (w.text || JSON.stringify(w)) : String(w);
            const confBadge = (typeof w === 'object' && w !== null && w.confidence === 'high')
              ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">Yüksek Güven</span>`
              : '';
            return `
              <div class="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl flex items-start gap-2.5 text-xs font-medium text-[#1b1c1a] shadow-2xs">
                <span class="material-symbols-outlined text-rose-600 text-base shrink-0 mt-0.5">warning</span>
                <span class="leading-relaxed flex-1">${text}</span>
                ${confBadge}
              </div>`;
          }).join('')
        : '<p class="text-xs text-[#8a8580] italic">Gelişim alanı verisi bulunmuyor.</p>';
    }
  }

  // ÖNERİLER
  const sugContainer = document.getElementById('suggestions-container');
  const suggestions = latestAnalysis ? latestAnalysis.suggestions : [];
  if (sugContainer) {
    if (isProcessing) {
      sugContainer.innerHTML = `
        <div class="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center gap-3 animate-pulse text-xs text-blue-800 font-medium">
          <span class="material-symbols-outlined text-blue-600 animate-spin text-sm">sync</span>
          <span>Mülakat önerileri ve tavsiyeler hazırlanıyor...</span>
        </div>`;
    } else if (Array.isArray(suggestions) && suggestions.length > 0) {
      sugContainer.innerHTML = suggestions.map((s: any, idx: number) => {
        const actionText = typeof s === 'string' ? s : (s.action || s.question || JSON.stringify(s));
        const priority = (typeof s === 'object' && s.priority) ? s.priority : (idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low');
        const timeframe = (typeof s === 'object' && s.timeframe) ? s.timeframe : (idx === 1 ? 'Orta Vadeli' : 'Kısa Vadeli');

        let priorityBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Orta Öncelik</span>';
        if (priority === 'high') priorityBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Yüksek Öncelik</span>';
        if (priority === 'low') priorityBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Düşük Öncelik</span>';

        return `
          <div class="p-3.5 bg-[#faf9f5] border border-[#ddd9d3] rounded-xl space-y-2 shadow-2xs">
            <div class="flex justify-between items-center">
              ${priorityBadge}
              <span class="text-[10px] font-bold text-[#8a8580] flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">schedule</span> ${timeframe}
              </span>
            </div>
            <div class="flex items-start gap-2 text-xs font-semibold text-[#1b1c1a]">
              <span class="material-symbols-outlined text-amber-600 text-base shrink-0">lightbulb</span>
              <span class="leading-relaxed">${actionText}</span>
            </div>
          </div>`;
      }).join('');
    } else {
      sugContainer.innerHTML = '<p class="text-xs text-[#8a8580] italic">Tavsiye verisi bulunmuyor.</p>';
    }
  }

  // MÜLAKAT SORULARI
  const questContainer = document.getElementById('questions-container');
  const questions = latestAnalysis ? latestAnalysis.interviewQuestions : [];
  if (questContainer) {
    if (isProcessing) {
      questContainer.innerHTML = `
        <div class="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center gap-3 animate-pulse text-xs text-indigo-800 font-medium">
          <span class="material-symbols-outlined text-indigo-600 animate-spin text-sm">sync</span>
          <span>Yapay zeka aday için özel teknik ve davranışsal mülakat soruları üretiyor...</span>
        </div>`;
    } else if (Array.isArray(questions) && questions.length > 0) {
      questContainer.innerHTML = questions.map((q: any, idx: number) => {
        const qText = typeof q === 'string' ? q : (q.question || q.text || JSON.stringify(q));
        const category = (typeof q === 'object' && q.category) ? q.category : (idx % 2 === 0 ? 'Teknik Yetkinlik' : 'Davranışsal Soru');
        const expectedAnswer = (typeof q === 'object' && q.expectedAnswer) ? q.expectedAnswer : null;

        return `
          <div class="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-1.5 shadow-2xs">
            <div class="flex justify-between items-center">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Soru #${idx + 1} - ${category}
              </span>
            </div>
            <div class="flex items-start gap-2.5 text-xs font-bold text-indigo-950">
              <span class="material-symbols-outlined text-indigo-600 text-base shrink-0 mt-0.5">quiz</span>
              <span class="leading-relaxed">${qText}</span>
            </div>
            ${expectedAnswer ? `
              <div class="mt-2 pt-2 border-t border-indigo-200/50 text-[11px] text-indigo-900 font-medium flex items-start gap-2">
                <span class="material-symbols-outlined text-xs text-indigo-500 mt-0.5 shrink-0">task_alt</span>
                <span><strong>Beklenen Cevap/İpucu:</strong> ${expectedAnswer}</span>
              </div>` : ''}
          </div>`;
      }).join('');
    } else {
      questContainer.innerHTML = '<p class="text-xs text-[#8a8580] italic">Mülakat sorusu bulunmuyor.</p>';
    }
  }
}
