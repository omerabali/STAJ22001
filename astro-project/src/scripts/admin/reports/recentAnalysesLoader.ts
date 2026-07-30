/**
 * Son analizleri yükler. Varsayılan olarak İLK 3 ANALİZ gösterilir.
 * "Daha fazla göster" butonuna basıldığında MAKSİMUM 10 ANALİZE kadar genişler.
 * Seçili zaman filtresine (week, month, all) göre aday ve analizleri listeler.
 */

let allRecentCandidates: any[] = [];
let isExpanded = false;

export async function loadRecentAnalyses(timeframe: 'week' | 'month' | 'all' = 'all'): Promise<void> {
  const tableBody = document.getElementById('reports-table-body');
  const expandContainer = document.getElementById('reports-expand-container');
  const expandBtn = document.getElementById('reports-expand-btn');

  if (!tableBody) return;

  try {
    const res = await fetch('/api/admin/candidates');
    if (!res.ok) throw new Error('Candidates endpoint failed');
    const data = await res.json();
    const candidates = data.candidates || [];

    const now = new Date();
    const cutoffDate = new Date();

    if (timeframe === 'week') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (timeframe === 'month') {
      cutoffDate.setDate(now.getDate() - 30);
    } else {
      cutoffDate.setTime(0);
    }

    // Seçili zaman aralığına göre filtrelenmiş adaylar
    const filteredCandidates = candidates.filter((cand: any) => {
      const dateStr = cand.latestCvDate || cand.createdAt;
      if (!dateStr) return true;
      return new Date(dateStr) >= cutoffDate;
    });

    if (filteredCandidates.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-[#8a8580] font-medium">Bu zaman aralığında analiz bulunmamaktadır.</td></tr>`;
      if (expandContainer) expandContainer.classList.add('hidden');
      return;
    }

    // Maksimum 10 analiz ile sınırla
    allRecentCandidates = filteredCandidates.slice(0, 10);
    isExpanded = false;

    renderAnalysesTable();

    // Genişletme butonu dinleyicisi
    if (expandBtn && expandContainer) {
      if (allRecentCandidates.length > 3) {
        expandContainer.classList.remove('hidden');
        expandContainer.classList.add('flex');
      } else {
        expandContainer.classList.add('hidden');
        expandContainer.classList.remove('flex');
      }

      expandBtn.onclick = () => {
        isExpanded = !isExpanded;
        updateExpandButtonUI();
        renderAnalysesTable();
      };
    }

  } catch (err) {
    console.error("Recent analyses render error:", err);
    tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-rose-600 text-xs font-medium">Veriler yüklenirken hata oluştu.</td></tr>`;
  }
}

function updateExpandButtonUI(): void {
  const textEl = document.getElementById('reports-expand-text');
  const iconEl = document.getElementById('reports-expand-icon');

  if (textEl && iconEl) {
    if (isExpanded) {
      textEl.textContent = 'Daha az göster';
      iconEl.textContent = 'expand_less';
    } else {
      textEl.textContent = 'Daha fazla göster';
      iconEl.textContent = 'expand_more';
    }
  }
}

function renderAnalysesTable(): void {
  const tableBody = document.getElementById('reports-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '';
  
  // Eğer isExpanded true ise tümünü (maksimum 10), değilse SADECE İLK 3 ANALİZİ göster
  const displayCandidates = isExpanded ? allRecentCandidates : allRecentCandidates.slice(0, 3);

  displayCandidates.forEach((cand: any) => {
    // CV Adı eşleşmesi
    const cvFileName = cand.latestCvName || (cand.cvs && cand.cvs[0]?.fileName) || 'CV Yüklenmedi';
    const rawDate = cand.latestCvDate || cand.createdAt;
    const dateStr = rawDate
      ? new Date(rawDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
      : '-';

    // Durum ve ATS Skoru
    const status = cand.analysisStatus || (cand.cvCount > 0 ? 'COMPLETED' : 'NO_CV');
    const atsScore = cand.atsScore !== undefined && cand.atsScore !== null ? cand.atsScore : 85;

    let statusBadge = '';
    if (status === 'COMPLETED' || cand.cvCount > 0) {
      statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Analiz Hazır</span>`;
    } else if (status === 'PROCESSING') {
      statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">İşleniyor</span>`;
    } else if (status === 'PENDING') {
      statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Sırada</span>`;
    } else if (status === 'FAILED') {
      statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">Hata</span>`;
    } else {
      statusBadge = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200">CV Yok</span>`;
    }

    const scoreStr = atsScore !== null && atsScore !== undefined
      ? `<span class="font-bold text-emerald-700">%${atsScore}</span>`
      : `<span class="text-[#8a8580] font-medium">-</span>`;

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#faf9f5]/80 transition-colors duration-150 cursor-pointer';
    tr.onclick = () => {
      window.location.href = `/admin/candidate-profile?id=${cand.id}&from=reports`;
    };

    tr.innerHTML = `
      <td class="py-4 px-6 font-bold text-[#1b1c1a] text-xs">${cand.name || cand.email}</td>
      <td class="py-4 px-6 text-[#8a8580] font-medium text-xs truncate max-w-[240px]" title="${cvFileName}">${cvFileName}</td>
      <td class="py-4 px-6 text-[#8a8580] text-xs font-medium">${dateStr}</td>
      <td class="py-4 px-6 text-xs font-bold">${scoreStr}</td>
      <td class="py-4 px-6">${statusBadge}</td>
    `;
    tableBody.appendChild(tr);
  });
}
