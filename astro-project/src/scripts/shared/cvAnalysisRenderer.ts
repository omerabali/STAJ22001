/**
 * cvAnalysisRenderer.ts
 * Helper functions to render ATS scores, SWOT analysis, and structured suggestions into DOM.
 */

export interface ParsedSuggestion {
  priority: 'high' | 'medium' | 'low';
  timeframe: string;
  action?: string;
  question?: string;
}

export function parseSuggestions(rawSuggestions: any[]): { recList: ParsedSuggestion[]; qList: ParsedSuggestion[] } {
  const recList: ParsedSuggestion[] = [];
  const qList: ParsedSuggestion[] = [];

  if (!Array.isArray(rawSuggestions)) return { recList, qList };

  rawSuggestions.forEach((item) => {
    if (typeof item === 'object' && item !== null && item.action) {
      recList.push({
        priority: item.priority || 'medium',
        timeframe: item.timeframe || 'Kısa Vadeli',
        action: item.action
      });
      if (item.question) {
        qList.push({
          priority: item.priority || 'medium',
          timeframe: item.timeframe || 'Kısa Vadeli',
          question: item.question
        });
      }
    } else if (typeof item === 'string') {
      let priority: 'high' | 'medium' | 'low' = 'medium';
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
      }
    }
  });

  return { recList, qList };
}

export function renderStrengthsHtml(strengths: string[]): string {
  if (!Array.isArray(strengths) || strengths.length === 0) {
    return `<p class="text-xs text-[#8a8580] italic">Güçlü yön verisi bulunamadı.</p>`;
  }
  return `
    <div class="space-y-2">
      ${strengths.map(s => `
        <div class="flex items-start gap-2 text-xs text-[#1b1c1a] leading-relaxed bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-lg shadow-2xs">
          <span class="material-symbols-outlined text-emerald-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
          <span>${s}</span>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderWeaknessesHtml(weaknesses: string[]): string {
  if (!Array.isArray(weaknesses) || weaknesses.length === 0) {
    return `<p class="text-xs text-[#8a8580] italic">Eksik yön tespit edilmedi.</p>`;
  }
  return `
    <div class="space-y-2">
      ${weaknesses.map(w => `
        <div class="flex items-start gap-2 text-xs text-[#1b1c1a] leading-relaxed bg-rose-50/80 border border-rose-200/80 p-3 rounded-lg shadow-2xs">
          <span class="material-symbols-outlined text-rose-600 text-[16px] shrink-0 mt-0.5">warning</span>
          <span>${w}</span>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderSuggestionsHtml(recList: ParsedSuggestion[]): string {
  if (recList.length === 0) {
    return `<p class="text-xs text-[#8a8580] italic">Mülakat önerisi bulunamadı.</p>`;
  }
  return `
    <div class="space-y-2">
      ${recList.map(rec => {
        const p = rec.priority || 'medium';
        const badgeClass = p === 'high'
          ? 'bg-rose-100 text-rose-800 border-rose-200'
          : p === 'low'
          ? 'bg-blue-100 text-blue-800 border-blue-200'
          : 'bg-amber-100 text-amber-800 border-amber-200';
        const pLabel = p === 'high' ? 'Yüksek Öncelik' : p === 'low' ? 'Düşük Öncelik' : 'Orta Öncelik';

        return `
          <div class="p-3 rounded-lg border border-[#ddd9d3] bg-[#faf9f5] flex flex-col gap-1.5 shadow-2xs">
            <div class="flex items-center justify-between gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">${pLabel}</span>
              <span class="text-[10px] text-[#8a8580] font-semibold flex items-center gap-1">
                <span class="material-symbols-outlined text-[12px]">schedule</span>
                ${rec.timeframe || 'Kısa Vadeli'}
              </span>
            </div>
            <div class="flex items-start gap-2 text-xs text-[#1b1c1a] leading-relaxed">
              <span class="material-symbols-outlined text-amber-600 text-[16px] shrink-0 mt-0.5">lightbulb</span>
              <span>${rec.action}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function renderQuestionsHtml(qList: ParsedSuggestion[]): string {
  if (qList.length === 0) {
    return `<p class="text-xs text-[#8a8580] italic">Mülakat sorusu bulunamadı.</p>`;
  }
  return `
    <div class="space-y-2">
      ${qList.map(item => `
        <div class="p-3 rounded-lg border border-[#14422f]/20 bg-[#14422f]/5 flex flex-col gap-1.5 shadow-2xs">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold text-[#14422f] uppercase tracking-wider flex items-center gap-1">
              <span class="material-symbols-outlined text-[12px]">quiz</span> Mülakat Sorusu
            </span>
            <span class="text-[10px] text-[#14422f]/70 font-semibold">${item.timeframe || 'Görüşme Aşaması'}</span>
          </div>
          <div class="flex items-start gap-2 text-xs text-[#14422f] font-semibold leading-relaxed italic">
            <span class="material-symbols-outlined text-[#14422f] text-[16px] shrink-0 mt-0.5 not-italic">help</span>
            <span>${item.question}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
