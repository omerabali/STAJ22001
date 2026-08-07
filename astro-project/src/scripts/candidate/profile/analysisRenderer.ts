/**
 * analysisRenderer.ts (Profil Analiz Sonuç Çizim Yöneticisi)
 * Görevi: Profil sayfasında seçilen CV'nin yapay zeka ATS skoru, SWOT analizi kartları,
 * tavsiyeler ve çıkarılan yetenek kelimelerini sağ taraftaki panelde canlı olarak gösterir.
 */
import { parseSuggestions, renderStrengthsHtml, renderWeaknessesHtml, renderSuggestionsHtml, renderQuestionsHtml } from '../../shared/cvAnalysisRenderer';
import { showLiveProcessingState } from './liveStateUi.ts';

export function showAnalysisDetails(cv: any, analysis: any): void {
  const noState = document.getElementById('no-analysis-state');
  const activeState = document.getElementById('active-analysis-state');
  if (!noState || !activeState) return;

  noState.classList.add('hidden');
  activeState.classList.remove('hidden');

  const cvNameEl = document.getElementById('analysis-cv-name');
  if (cvNameEl) cvNameEl.textContent = cv.fileName;

  const statusIndicator = document.getElementById('analysis-status-indicator');
  const contentArea = document.getElementById('analysis-content-area');

  if (!analysis || !statusIndicator || !contentArea) return;

  const status = analysis.status;

  if (status === 'COMPLETED') {
    statusIndicator.innerHTML = `<span class="material-symbols-outlined text-emerald-600 text-3xl">verified</span>`;
    contentArea.classList.remove('hidden');

    if (analysis.atsScore === null) {
      const skillsHtml = Array.isArray(analysis.skills) && analysis.skills.length > 0
        ? analysis.skills.map((s: string) => `<span class="px-3 py-1.5 rounded-full bg-white border border-[#ddd9d3] text-[#14422f] text-xs font-semibold shadow-sm cursor-default">${s}</span>`).join('')
        : `<span class="text-xs text-[#8a8580]">Yetenek kelimeleri çıkarılamadı.</span>`;

      contentArea.innerHTML = `
        <div class="space-y-4 flex flex-col h-full overflow-hidden">
          <div class="space-y-2 shrink-0">
            <h4 class="text-[10px] font-bold text-[#8a8580] tracking-widest uppercase px-1">ÖZGEÇMİŞTEN ÇIKARILAN YETENEKLER</h4>
            <div class="flex flex-wrap gap-2 pt-1">${skillsHtml}</div>
          </div>
          <div class="space-y-2 flex-1 flex flex-col overflow-hidden">
            <h4 class="text-[10px] font-bold text-[#8a8580] tracking-widest uppercase px-1">BÖLÜMLERE GÖRE PARÇALAMA (CHUNKS)</h4>
            <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3" id="profile-chunk-area"><p class="text-xs text-[#8a8580] text-center py-4 animate-pulse">Parçalar yükleniyor...</p></div>
          </div>
        </div>
      `;

      fetch(`/api/cv/${cv.id}/chunks`)
        .then(r => r.json())
        .then(d => {
          const chunks = d.chunks || [];
          const area = document.getElementById('profile-chunk-area');
          if (!area) return;
          if (chunks.length === 0) {
            area.innerHTML = `<p class="text-xs text-[#8a8580] text-center py-4">Metin parçaları henüz oluşturulmadı.</p>`;
            return;
          }
          area.innerHTML = chunks.map((chunk: any, idx: number) => {
            const firstBreak = chunk.chunkText.indexOf('\n');
            const header = firstBreak !== -1 ? chunk.chunkText.substring(0, firstBreak) : `PARÇA #${idx + 1}`;
            const body = firstBreak !== -1 ? chunk.chunkText.substring(firstBreak + 1) : chunk.chunkText;
            const wordCount = body.split(/\s+/).filter((w: string) => w.length > 0).length;
            return `
              <div class="group bg-[#faf9f5] rounded-[10px] border-l-4 border-[#14422f] p-5 border border-[#ddd9d3] hover:bg-[#f5f4f0] transition-all text-left">
                <div class="flex justify-between items-start mb-2">
                  <span class="text-[10px] font-bold text-[#14422f] uppercase tracking-wider">${header}</span>
                  <span class="text-[10px] font-mono text-[#8a8580] bg-white border border-[#ddd9d3] px-2 py-1 rounded">${wordCount} kelime</span>
                </div>
                <p class="text-xs text-[#1b1c1a] leading-relaxed font-sans whitespace-pre-wrap select-all max-h-[120px] overflow-y-auto pr-2 mt-2">${body}</p>
              </div>
            `;
          }).join('');
        })
        .catch(() => {
          const area = document.getElementById('profile-chunk-area');
          if (area) area.innerHTML = `<p class="text-xs text-rose-600 text-center py-4">Parçalar yüklenirken hata oluştu.</p>`;
        });

      return;
    } else {
      const strengths = analysis.strengths || [];
      const strengthsHtml = renderStrengthsHtml(strengths);

      const weaknesses = analysis.weaknesses || analysis.eksik_yonler || analysis.gelisime_acik_yonler || [];
      const weaknessesHtml = renderWeaknessesHtml(weaknesses);

      const rawSuggestions = analysis.suggestions || [];
      const { recList, qList } = parseSuggestions(rawSuggestions);

      const suggestionsHtml = renderSuggestionsHtml(recList);
      const questionsHtml = renderQuestionsHtml(qList);

      const skillsHtml = Array.isArray(analysis.skills) && analysis.skills.length > 0
        ? analysis.skills.map((s: string) => `
            <span class="px-3 py-1.5 rounded-full bg-[#14422f]/10 border border-[#14422f]/20 text-[#14422f] text-xs font-semibold shadow-sm cursor-default">
              ${s}
            </span>
          `).join('')
        : `<span class="text-xs text-[#8a8580]">Yetenek kelimeleri çıkarılamadı.</span>`;

      contentArea.innerHTML = `
        <div class="space-y-6 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
          <div class="flex items-center gap-6 bg-[#faf9f5] p-5 rounded-[10px] border border-[#ddd9d3] shrink-0 text-left">
            <div class="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path class="text-[#ddd9d3]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3"></path>
                <path class="text-emerald-600" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="${analysis.atsScore}, 100" stroke-linecap="round" stroke-width="3"></path>
              </svg>
              <span class="absolute text-lg font-bold text-[#1b1c1a]">%${analysis.atsScore}</span>
            </div>
            <div>
              <span class="text-[10px] text-[#14422f] uppercase font-bold tracking-widest">GENEL UYUM SKORU</span>
              <h5 class="text-md font-bold text-[#1b1c1a] mt-1">${analysis.role || 'Özgeçmiş Analizi'}</h5>
              <p class="text-xs text-[#8a8580] mt-0.5">Yapay zeka uyumluluk skoru hesaplandı.</p>
            </div>
          </div>

          <div class="space-y-2 shrink-0 text-left">
            <h4 class="text-[10px] font-bold text-[#8a8580] tracking-widest uppercase px-1">ÖNE ÇIKAN YETENEKLER</h4>
            <div class="flex flex-wrap gap-2 pt-1">
              ${skillsHtml}
            </div>
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
  } else if (status === 'PROCESSING' || status === 'PENDING') {
    if (!document.getElementById('profile-step-title')) {
      showLiveProcessingState(cv.fileName);
    }
  } else {
    statusIndicator.innerHTML = `<span class="material-symbols-outlined text-rose-600 text-3xl">error</span>`;
    contentArea.innerHTML = `
      <div class="text-center py-12 text-[#8a8580] flex flex-col items-center justify-center h-full space-y-6 my-auto">
        <div class="w-24 h-24 rounded-full border border-rose-200 bg-rose-50 flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined text-5xl text-rose-600">error</span>
        </div>
        <div class="text-center max-w-sm px-4">
          <h3 class="text-lg font-bold text-rose-600 mb-2">Ayrıştırma Hatası</h3>
          <p class="text-xs text-[#8a8580] leading-relaxed font-medium">PDF belgesi parse edilirken sunucu hatası oluştu. Lütfen dosyanın şifreli veya bozuk olmadığından emin olun.</p>
        </div>
      </div>
    `;
  }
}
