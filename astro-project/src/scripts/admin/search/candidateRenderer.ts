/**
 * candidateRenderer.ts (Vektörel Semantik Arama Sonuç Çizici)
 * Görevi: Yapay zeka vektör aramasından (pgvector) dönen aday sonuçlarını
 * eşleşme yüzdeleri (%95 Uyum vb.) ve rezonans kartları ile ekrana çizer.
 */
import { renderCandidateCardHtml } from './searchRenderer';

export function renderSemanticCandidates(results: any[]): void {
  const grid = document.getElementById('semantic-candidates-grid');
  if (!grid) return;

  if (results.length === 0) {
    grid.innerHTML = `
      <div class="col-span-1 bg-white border border-[#ddd9d3] rounded-[10px] p-12 flex flex-col items-center justify-center text-center shadow-sm">
        <span class="material-symbols-outlined text-5xl text-[#8a8580]/40 mb-4">person_search</span>
        <p class="text-[#8a8580] font-body-md font-medium">Bu kriterlere uygun hiçbir aday bulunamadı.</p>
        <p class="text-xs text-[#8a8580] mt-1">Lütfen daha geniş kriterler veya farklı anahtar kelimeler girmeyi deneyin.</p>
      </div>`;
    return;
  }

  grid.innerHTML = results.map(item => renderCandidateCardHtml(item)).join('');
}
