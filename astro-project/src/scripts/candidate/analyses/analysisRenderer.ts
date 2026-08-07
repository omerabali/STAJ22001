import { parseSuggestions, renderStrengthsHtml, renderWeaknessesHtml, renderSuggestionsHtml, renderQuestionsHtml } from '../../shared/cvAnalysisRenderer';

export function showAnalysisDetails(cv: any, analysis: any): void {
  const noState = document.getElementById('no-analysis-state');
  const activeState = document.getElementById('active-analysis-state');
  if (!noState || !activeState) return;

  noState.classList.add('hidden');
  activeState.classList.remove('hidden');
  activeState.classList.add('flex');

  const nameEl = document.getElementById('analysis-cv-name') as HTMLElement;
  if (nameEl) nameEl.textContent = cv.fileName;

  const statusIndicator = document.getElementById('analysis-status-indicator') as HTMLElement;
  const contentArea = document.getElementById('analysis-content-area') as HTMLElement;
  if (!analysis) return;

  const status = analysis.status;

  if (status === 'COMPLETED') {
    statusIndicator.innerHTML = `<span class="material-symbols-outlined text-emerald-600 text-3xl">verified</span>`;

    if (analysis.atsScore === null) {
      // Chunks var ama AI skoru yok
      const skillsHtml = Array.isArray(analysis.skills) && analysis.skills.length > 0
        ? analysis.skills.map((s: string) => `
            <span class="px-3 py-1.5 rounded-full bg-white border border-[#ddd9d3] text-[#14422f] text-xs font-semibold shadow-sm cursor-default">${s}</span>
          `).join('')
        : `<span class="text-xs text-[#8a8580]">Yetenek kelimeleri çıkarılamadı.</span>`;

      const chunkHtml = cv.chunks && cv.chunks.length > 0
        ? cv.chunks.map((chunk: any, idx: number) => {
            const firstLB = chunk.chunkText.indexOf('\n');
            const header = firstLB !== -1 ? chunk.chunkText.substring(0, firstLB) : `PARÇA #${idx + 1}`;
            const body = firstLB !== -1 ? chunk.chunkText.substring(firstLB + 1) : chunk.chunkText;
            const wordCount = body.split(/\s+/).filter((w: string) => w.length > 0).length;
            return `
              <div class="bg-[#faf9f5] border border-[#ddd9d3] rounded-[10px] p-5 hover:bg-[#f5f4f0] transition-all text-left">
                <div class="flex justify-between items-start mb-2">
                  <span class="text-[10px] font-bold text-[#14422f] uppercase tracking-wider">${header}</span>
                  <span class="text-[10px] font-mono text-[#8a8580] bg-white border border-[#ddd9d3] px-2 py-0.5 rounded">${wordCount} kelime</span>
                </div>
                <p class="text-xs text-[#1b1c1a] leading-relaxed font-sans whitespace-pre-wrap select-all max-h-[120px] overflow-y-auto pr-2 mt-2">${body}</p>
              </div>
            `;
          }).join('')
        : `<p class="text-xs text-[#8a8580] text-center py-4">Metin parçaları veritabanında bulunamadı.</p>`;

      contentArea.innerHTML = `
        <div class="space-y-4 flex flex-col h-full overflow-hidden">
          <div class="space-y-2 shrink-0">
            <h4 class="text-[10px] font-bold text-[#8a8580] tracking-widest uppercase px-1">ÖZGEÇMİŞTEN ÇIKARILAN YETENEKLER</h4>
            <div class="flex flex-wrap gap-2 pt-1">${skillsHtml}</div>
          </div>
          <div class="space-y-2 flex-1 flex flex-col overflow-hidden">
            <h4 class="text-[10px] font-bold text-[#8a8580] tracking-widest uppercase px-1">BÖLÜMLERE GÖRE PARÇALAMA (CHUNKS)</h4>
            <div class="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar mt-1" style="max-height: 320px;">${chunkHtml}</div>
          </div>
        </div>
      `;
    } else {
      // Tam AI raporu
      const pct = analysis.atsScore;
      const skillsHtml = Array.isArray(analysis.skills) && analysis.skills.length > 0
        ? analysis.skills.map((s: string) => `
            <span class="px-3 py-1.5 rounded-full bg-[#14422f]/10 border border-[#14422f]/20 text-[#14422f] text-xs font-semibold shadow-sm cursor-default">${s}</span>
          `).join('')
        : `<span class="text-xs text-[#8a8580]">Yetenek kelimeleri çıkarılamadı.</span>`;

      const strengths = analysis.strengths || [];
      const strengthsHtml = renderStrengthsHtml(strengths);

      const weaknesses = analysis.weaknesses || analysis.eksik_yonler || analysis.gelisime_acik_yonler || [];
      const weaknessesHtml = renderWeaknessesHtml(weaknesses);

      const rawSuggestions: any[] = analysis.suggestions || [];
      const recList: any[] = [];
      const qList: any[] = [];

      rawSuggestions.forEach((item) => {
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
            recList.push({ priority, timeframe: 'Kısa Vadeli', action: item.replace('💡 İK Tavsiyesi:', '').trim() });
          }
        }
      });

      const suggestionsHtml = recList.length > 0
        ? `<div class="space-y-2">${recList.map(rec => {
            const p = rec.priority || 'medium';
            const badgeClass = p === 'high' ? 'bg-rose-100 text-rose-800 border-rose-200' : p === 'low' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-200';
            const pLabel = p === 'high' ? 'Yüksek Öncelik' : p === 'low' ? 'Düşük Öncelik' : 'Orta Öncelik';
            return `
              <div class="p-3 rounded-lg border border-[#ddd9d3] bg-[#faf9f5] flex flex-col gap-1.5 shadow-2xs">
                <div class="flex items-center justify-between gap-2">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}">${pLabel}</span>
                  <span class="text-[10px] text-[#8a8580] font-semibold flex items-center gap-1">
                    <span class="material-symbols-outlined text-[12px]">schedule</span>${rec.timeframe || 'Kısa Vadeli'}
                  </span>
                </div>
                <div class="flex items-start gap-2 text-xs text-[#1b1c1a] leading-relaxed">
                  <span class="material-symbols-outlined text-amber-600 text-[16px] shrink-0 mt-0.5">lightbulb</span>
                  <span>${rec.action}</span>
                </div>
              </div>
            `;
          }).join('')}</div>`
        : `<p class="text-xs text-[#8a8580] italic">Mülakat önerisi bulunamadı.</p>`;

      const questionsHtml = qList.length > 0
        ? `<div class="space-y-2">${qList.map(item => `
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
          `).join('')}</div>`
        : `<p class="text-xs text-[#8a8580] italic">Mülakat sorusu bulunamadı.</p>`;

      contentArea.innerHTML = `
        <div class="space-y-6 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
          <div class="flex items-center gap-6 bg-[#faf9f5] p-5 rounded-[10px] border border-[#ddd9d3] shrink-0 text-left">
            <div class="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path class="text-[#ddd9d3]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3"></path>
                <path class="text-emerald-600" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="${pct}, 100" stroke-linecap="round" stroke-width="3"></path>
              </svg>
              <span class="absolute text-lg font-bold text-[#1b1c1a]">%${pct}</span>
            </div>
            <div>
              <span class="text-[10px] text-[#14422f] uppercase font-bold tracking-widest">GENEL UYUM SKORU</span>
              <h5 class="text-md font-bold text-[#1b1c1a] mt-1">${analysis.role || 'Özgeçmiş Analizi'}</h5>
              <p class="text-xs text-[#8a8580] mt-0.5">Yapay zeka uyumluluk skoru hesaplandı.</p>
            </div>
          </div>
          <div class="space-y-2 text-left">
            <h4 class="text-[10px] font-bold text-[#8a8580] tracking-widest uppercase px-1">ÖNE ÇIKAN YETENEKLER</h4>
            <div class="flex flex-wrap gap-2 pt-1">${skillsHtml}</div>
          </div>
          <div class="grid grid-cols-1 gap-5 pt-1 shrink-0">
            <div class="space-y-2 text-left">
              <span class="text-xs text-emerald-800 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                <span class="material-symbols-outlined text-emerald-600 text-base">thumb_up</span> GÜÇLÜ YÖNLER
              </span>
              ${strengthsHtml}
            </div>
            <div class="space-y-2 text-left">
              <span class="text-xs text-rose-800 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                <span class="material-symbols-outlined text-rose-600 text-base">warning</span> EKSİK YÖNLER
              </span>
              ${weaknessesHtml}
            </div>
            <div class="space-y-2 text-left">
              <span class="text-xs text-amber-800 font-bold flex items-center gap-1.5 uppercase tracking-wide">
                <span class="material-symbols-outlined text-amber-600 text-base">tips_and_updates</span> MÜLAKAT ÖNERİLERİ (TAVSİYELER)
              </span>
              ${suggestionsHtml}
            </div>
            <div class="space-y-2 text-left">
              <span class="text-xs text-[#14422f] font-bold flex items-center gap-1.5 uppercase tracking-wide">
                <span class="material-symbols-outlined text-[#14422f] text-base">help_center</span> MÜLAKATTA SORULACAK SORULAR
              </span>
              ${questionsHtml}
            </div>
          </div>
        </div>
      `;
    }
  } else if (status === 'PENDING') {
    statusIndicator.innerHTML = `<span class="material-symbols-outlined text-[#8a8580] text-3xl animate-pulse">schedule</span>`;
    contentArea.innerHTML = `
      <div class="text-center py-12 text-[#8a8580] flex flex-col items-center justify-center h-full space-y-6 my-auto">
        <div class="w-24 h-24 rounded-full border border-[#ddd9d3] bg-[#faf9f5] flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined text-5xl text-[#8a8580] animate-pulse">schedule</span>
        </div>
        <div class="text-center w-full max-w-[320px] px-4 mx-auto">
          <h3 class="text-lg font-bold text-[#1b1c1a] mb-2">İşlem Sırasında</h3>
          <p class="text-xs text-[#8a8580] leading-relaxed font-medium">CV dosyası sunucuya ulaştı, metin çıkarma sırasının kendisine gelmesi bekleniyor.</p>
        </div>
      </div>`;
  } else if (status === 'PROCESSING') {
    statusIndicator.innerHTML = `<span class="material-symbols-outlined text-blue-600 text-3xl animate-spin">progress_activity</span>`;
    contentArea.innerHTML = `
      <div class="text-center py-12 text-[#8a8580] flex flex-col items-center justify-center h-full space-y-6 my-auto">
        <div class="w-24 h-24 rounded-full border border-[#ddd9d3] bg-[#faf9f5] flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined text-5xl text-blue-600 animate-spin">progress_activity</span>
        </div>
        <div class="text-center w-full max-w-[320px] px-4 mx-auto">
          <h3 class="text-lg font-bold text-[#1b1c1a] mb-2">Metin Çıkarılıyor...</h3>
          <p class="text-xs text-[#8a8580] leading-relaxed font-medium">Özgeçmiş PDF belgesinden metinler ayıklanıyor ve semantik arama chunk'larına bölünüyor.</p>
        </div>
      </div>`;
  } else {
    statusIndicator.innerHTML = `<span class="material-symbols-outlined text-rose-600 text-3xl">error</span>`;
    contentArea.innerHTML = `
      <div class="text-center py-12 text-[#8a8580] flex flex-col items-center justify-center h-full space-y-6 my-auto">
        <div class="w-24 h-24 rounded-full border border-rose-200 bg-rose-50 flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined text-5xl text-rose-600">error</span>
        </div>
        <div class="text-center w-full max-w-[320px] px-4 mx-auto">
          <h3 class="text-lg font-bold text-rose-600 mb-2">Ayrıştırma Hatası</h3>
          <p class="text-xs text-[#8a8580] leading-relaxed font-medium">PDF belgesi parse edilirken sunucu hatası oluştu. Dosyanın şifreli veya bozuk olmadığından emin olun.</p>
        </div>
      </div>`;
  }
}
