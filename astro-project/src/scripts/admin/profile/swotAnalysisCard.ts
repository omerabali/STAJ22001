import { adminProfileState } from './adminProfileState';
import { showCvContent } from './cvContentViewer';

/**
 * SWOT analiz kartını günceller — ATS skor, güçlü yönler, zayıf yönler, öneriler, mülakat soruları.
 */
export function updateSwotAnalysisCard(cv: any): void {
  const cvNameEl = document.getElementById('swot-cv-name');
  const scoreBadgeEl = document.getElementById('swot-score-badge');
  const progressWrapper = document.getElementById('swot-progress-wrapper');
  const scorePctEl = document.getElementById('swot-score-pct');
  const scoreBarEl = document.getElementById('swot-score-bar') as HTMLElement | null;
  const strengthsEl = document.getElementById('swot-strengths-container');
  const weaknessesEl = document.getElementById('swot-weaknesses-container');
  const suggestionsEl = document.getElementById('swot-suggestions-container');

  const reanalyzeBtn = document.getElementById('reanalyze-cv-btn') as HTMLButtonElement | null;
  if (reanalyzeBtn) {
    reanalyzeBtn.classList.remove('hidden'); reanalyzeBtn.classList.add('flex');
    reanalyzeBtn.onclick = async () => {
      if (!confirm(`${cv.fileName} isimli özgeçmişi yeni Türkçe AI motoru ile yeniden analiz etmek istiyor musunuz?`)) return;
      reanalyzeBtn.disabled = true;
      reanalyzeBtn.innerHTML = `<span class="material-symbols-outlined text-[15px] animate-spin">progress_activity</span> Analiz Ediliyor...`;
      try {
        const res = await fetch(`/api/cv/${cv.id}/reanalyze`, { method: 'POST' });
        if (res.ok) { 
          setTimeout(() => window.location.reload(), 2500); 
        } else { 
          reanalyzeBtn.disabled = false; 
          reanalyzeBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">refresh</span> Yeniden AI Analiz Et`; 
        }
      } catch { reanalyzeBtn.disabled = false; reanalyzeBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">refresh</span> Yeniden AI Analiz Et`; }
    };
  }

  if (!cvNameEl) return;
  cvNameEl.textContent = `${cv.fileName} - Yapay Zeka Değerlendirmesi`;

  const analysis = cv.analyses && cv.analyses[0];
  if (!analysis) {
    if (scoreBadgeEl) scoreBadgeEl.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">Analiz Yok</span>';
    if (progressWrapper) progressWrapper.classList.add('hidden');
    if (strengthsEl) strengthsEl.innerHTML = '<p class="text-xs text-[#8a8580] italic">Bu özgeçmiş için henüz yapay zeka analizi oluşturulmamış.</p>';
    if (weaknessesEl) weaknessesEl.innerHTML = '<p class="text-xs text-[#8a8580] italic">Gelişim alanı verisi yok.</p>';
    if (suggestionsEl) suggestionsEl.innerHTML = '<p class="text-xs text-[#8a8580] italic">Mülakat önerisi yok.</p>';
    return;
  }

  const score = analysis.atsScore;
  if (score !== null && progressWrapper && scorePctEl && scoreBarEl && scoreBadgeEl) {
    progressWrapper.classList.remove('hidden');
    scorePctEl.textContent = `%${score}`;
    scoreBarEl.style.width = `${score}%`;
    const badgeClass = score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';
    scoreBadgeEl.innerHTML = `<span class="px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}">%${score} ATS Skoru</span>`;
  } else {
    if (progressWrapper) progressWrapper.classList.add('hidden');
    if (scoreBadgeEl) scoreBadgeEl.innerHTML = '<span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">Skor Yok</span>';
  }

  // Strengths
  const strengths = analysis.strengths || [];
  if (strengthsEl) {
    strengthsEl.innerHTML = strengths.length > 0
      ? `<ul class="space-y-1.5">${strengths.map((s: string) => `<li class="flex items-start gap-2 text-xs text-[#1b1c1a] leading-relaxed bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-lg"><span class="material-symbols-outlined text-emerald-600 text-[15px] shrink-0 mt-0.5">check_circle</span><span>${s}</span></li>`).join('')}</ul>`
      : '<p class="text-xs text-[#8a8580] italic">Güçlü yön verisi bulunamadı.</p>';
  }

  // Weaknesses
  const weaknesses = analysis.weaknesses || analysis.eksik_yonler || analysis.gelisime_acik_yonler || [];
  if (weaknessesEl) {
    weaknessesEl.innerHTML = weaknesses.length > 0
      ? `<ul class="space-y-1.5">${weaknesses.map((w: string) => `<li class="flex items-start gap-2 text-xs text-[#1b1c1a] leading-relaxed bg-rose-50/70 border border-rose-100 p-2.5 rounded-lg"><span class="material-symbols-outlined text-rose-600 text-[15px] shrink-0 mt-0.5">warning</span><span>${w}</span></li>`).join('')}</ul>`
      : '<p class="text-xs text-[#8a8580] italic">Eksik yön tespit edilmedi.</p>';
  }

  // Suggestions & Questions parsing
  const rawSuggestions = analysis.suggestions || [];
  const questionsEl = document.getElementById('swot-questions-container');
  const recList: any[] = [];
  const qList: any[] = [];

  rawSuggestions.forEach((item: any) => {
    if (typeof item === 'object' && item !== null && item.action) {
      recList.push({ priority: item.priority || 'medium', timeframe: item.timeframe || 'Kısa Vadeli', action: item.action });
      if (item.question) qList.push({ priority: item.priority || 'medium', timeframe: item.timeframe || 'Kısa Vadeli', question: item.question });
    } else if (typeof item === 'string') {
      let priority = 'medium';
      if (item.toLowerCase().includes('high') || item.toLowerCase().includes('yüksek')) priority = 'high';
      else if (item.toLowerCase().includes('low') || item.toLowerCase().includes('düşük')) priority = 'low';

      if (item.includes('❓ Mülakat Sorusu:')) {
        const parts = item.split('❓ Mülakat Sorusu:');
        const rec = parts[0].replace('💡 İK Tavsiyesi:', '').trim();
        const q = parts[1]?.trim() || '';
        if (rec) recList.push({ priority, timeframe: 'Kısa Vadeli', action: rec });
        if (q) qList.push({ priority, timeframe: 'Kısa Vadeli', question: q });
      } else {
        const rec = item.replace('💡 İK Tavsiyesi:', '').trim();
        recList.push({ priority, timeframe: 'Kısa Vadeli', action: rec });
        qList.push({ priority, timeframe: 'Kısa Vadeli', question: '"Adayın bu alandaki geçmiş tecrübelerini ve projelerindeki somut katkılarını mülakatta detaylandırır mısınız?"' });
      }
    }
  });

  // Render suggestions
  if (suggestionsEl) {
    if (recList.length > 0) {
      suggestionsEl.innerHTML = `<div class="space-y-2">${recList.map(rec => {
        const p = rec.priority || 'medium';
        const badgeClass = p === 'high' ? 'bg-rose-100 text-rose-800 border-rose-200' : p === 'low' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-200';
        const pLabel = p === 'high' ? 'Yüksek Öncelik' : p === 'low' ? 'Düşük Öncelik' : 'Orta Öncelik';
        return `<div class="p-2.5 rounded-lg border border-[#ddd9d3] bg-[#faf9f5] flex flex-col gap-1.5"><div class="flex items-center justify-between gap-2"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">${pLabel}</span><span class="text-[10px] text-[#8a8580] font-semibold flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">schedule</span>${rec.timeframe || 'Kısa Vadeli'}</span></div><div class="flex items-start gap-2 text-xs text-[#1b1c1a] leading-relaxed"><span class="material-symbols-outlined text-amber-600 text-[15px] shrink-0 mt-0.5">lightbulb</span><span>${rec.action}</span></div></div>`;
      }).join('')}</div>`;
    } else {
      suggestionsEl.innerHTML = '<p class="text-xs text-[#8a8580] italic">Mülakat önerisi bulunamadı.</p>';
    }
  }

  // Render questions
  if (questionsEl) {
    if (qList.length > 0) {
      questionsEl.innerHTML = `<div class="space-y-2">${qList.map(item => `<div class="p-2.5 rounded-lg border border-[#14422f]/20 bg-[#14422f]/5 flex flex-col gap-1.5"><div class="flex items-center justify-between gap-2"><span class="text-[10px] font-bold text-[#14422f] uppercase tracking-wider flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">quiz</span> Mülakat Sorusu</span><span class="text-[10px] text-[#14422f]/70 font-semibold">${item.timeframe || 'Görüşme Aşaması'}</span></div><div class="flex items-start gap-2 text-xs text-[#14422f] font-semibold leading-relaxed italic"><span class="material-symbols-outlined text-[#14422f] text-[15px] shrink-0 mt-0.5 not-italic">help</span><span>${item.question}</span></div></div>`).join('')}</div>`;
    } else {
      questionsEl.innerHTML = '<p class="text-xs text-[#8a8580] italic">Mülakat sorusu bulunamadı.</p>';
    }
  }
}
