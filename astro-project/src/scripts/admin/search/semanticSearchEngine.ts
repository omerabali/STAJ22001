/**
 * semanticSearchEngine.ts (Akıllı Semantik Vektör Arama Motoru)
 * Görevi: Admin doğal dilde arama yazdığında (`text-embedding-3-small` vektör araması)
 * `POST /api/search` adresine istek atar, en alakalı adayları getirir ve hız için sonuçları sessionStorage'da önbellekler.
 */
import { renderSemanticCandidates } from './candidateRenderer.ts';
import { fetchSearchLogs } from './searchHistoryLogs.ts';

export async function executeSemanticSearch(isSearchLoadingState: { isSemanticLoading: boolean }): Promise<void> {
  const queryInput = document.getElementById('semantic-search-input') as HTMLInputElement;
  const topKInput = document.getElementById('semantic-topk-select') as HTMLSelectElement;
  const thresholdInput = document.getElementById('semantic-[#ddd9d3]-select') as HTMLSelectElement;
  const resultsCountEl = document.getElementById('semantic-results-count');
  const searchBtn = document.getElementById('semantic-search-btn');

  if (!queryInput) return;
  const query = queryInput.value.trim();
  if (!query) {
    alert("Lütfen arama yapmak için bir cümle veya anahtar kelime girin.");
    return;
  }

  const topK = topKInput ? parseInt(topKInput.value) : 10;
  const threshold = thresholdInput ? parseFloat(thresholdInput.value) : 0.3;

  isSearchLoadingState.isSemanticLoading = true;
  if (searchBtn) {
    searchBtn.setAttribute('disabled', 'true');
    searchBtn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Aranıyor...`;
  }

  const grid = document.getElementById('semantic-candidates-grid');
  if (grid) {
    grid.innerHTML = `
      <div class="col-span-1 bg-white border border-[#ddd9d3] rounded-[10px] p-12 flex flex-col items-center justify-center text-center shadow-sm">
        <span class="material-symbols-outlined text-4xl text-[#14422f] animate-spin mb-3">psychology</span>
        <p class="text-[#1b1c1a] font-bold text-sm">Vektör Tabanlı Semantik Arama Yapılıyor...</p>
        <p class="text-xs text-[#8a8580] mt-1">Yapay zeka CV içeriklerini çözümleyip en uygun adayları sıralıyor.</p>
      </div>`;
  }

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK, threshold })
    });

    if (!response.ok) throw new Error("Semantik arama isteği başarısız oldu.");

    const data = await response.json();
    const results = data.results || [];

    // SessionStorage'da sakla (Aday profilinden dönüldüğünde korunsun)
    sessionStorage.setItem('last_semantic_query', query);
    sessionStorage.setItem('last_semantic_results', JSON.stringify(results));

    if (resultsCountEl) resultsCountEl.textContent = `${results.length} uyumlu aday bulundu`;
    renderSemanticCandidates(results);
    fetchSearchLogs();

  } catch (err: any) {
    console.error("Semantik Arama Hatası:", err);
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-1 bg-white border border-rose-200 rounded-[10px] p-8 text-center">
          <span class="material-symbols-outlined text-4xl text-rose-500 mb-2">error</span>
          <p class="text-rose-700 font-bold text-sm">Arama Sırasında Hata Oluştu</p>
          <p class="text-xs text-[#8a8580] mt-1">${err.message || 'Lütfen tekrar deneyin.'}</p>
        </div>`;
    }
  } finally {
    isSearchLoadingState.isSemanticLoading = false;
    if (searchBtn) {
      searchBtn.removeAttribute('disabled');
      searchBtn.innerHTML = `<span class="material-symbols-outlined text-[18px]">search</span> Ara`;
    }
  }
}

/**
 * Önbellekteki son aramayı temizler (Raporlar, Compare vb. geçildiğinde çağrılır)
 */
export function clearSemanticSearchCache(): void {
  sessionStorage.removeItem('last_semantic_query');
  sessionStorage.removeItem('last_semantic_results');
}

/**
 * Önbellekteki son aramayı ve sonuçları ekrana yükler.
 */
export function restoreCachedSemanticSearch(): boolean {
  const lastQuery = sessionStorage.getItem('last_semantic_query');
  const lastResultsStr = sessionStorage.getItem('last_semantic_results');

  if (lastQuery && lastResultsStr) {
    try {
      const results = JSON.parse(lastResultsStr);
      const queryInput = document.getElementById('semantic-search-input') as HTMLInputElement;
      const resultsCountEl = document.getElementById('semantic-results-count');

      if (queryInput) queryInput.value = lastQuery;
      if (resultsCountEl) resultsCountEl.textContent = `${results.length} uyumlu aday bulundu (Önbellekten)`;

      renderSemanticCandidates(results);
      return true;
    } catch (e) {
      console.error("Restoring cached search error:", e);
      clearSemanticSearchCache();
    }
  }
  return false;
}
