/**
 * searchHistoryLogs.ts (Arama Geçmişi & Log Yükleyici)
 * Görevi: Backend'den (`/api/search/logs`) adminlerin daha önce yaptığı doğal dil aramalarını çeker,
 * arama geçmişi tablosuna ve son arananlar listesine canlı olarak doldurur.
 */
export async function deleteSearchLog(logId: string, event?: Event): Promise<void> {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const pillEl = event ? (event.target as HTMLElement).closest('.inline-flex') as HTMLElement : null;
  if (pillEl) {
    pillEl.style.transition = 'all 0.2s ease-out';
    pillEl.style.opacity = '0';
    pillEl.style.transform = 'scale(0.95) translateY(2px)';
    setTimeout(() => {
      pillEl.remove();
      const logsContainer = document.getElementById('search-logs-list');
      if (logsContainer && logsContainer.children.length === 0) {
        logsContainer.innerHTML = '<span class="text-xs text-[#8a8580] italic">Henüz arama geçmişi yok.</span>';
      }
    }, 200);
  }

  try {
    const res = await fetch(`/api/search/logs/${logId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    setTimeout(() => fetchSearchLogs(), 1000);
  } catch (err) {
    console.error("Arama geçmişi silinemedi:", err);
    fetchSearchLogs();
  }
}

export async function fetchSearchLogs(): Promise<void> {
  const logsContainer = document.getElementById('search-logs-list');
  if (!logsContainer) return;
  try {
    const res = await fetch('/api/search/logs');
    if (!res.ok) throw new Error("Arama geçmişi alınamadı.");
    const logs = await res.json();
    
    // Uniqe sorguları al ve en son yapılan SON 5 ARAMAYI FİLTRELE
    const seenQueries = new Set<string>();
    const uniqueLogs: any[] = [];

    for (const log of logs) {
      const qClean = (log.query || '').trim();
      if (qClean && !seenQueries.has(qClean.toLowerCase())) {
        seenQueries.add(qClean.toLowerCase());
        uniqueLogs.push(log);
      }
      if (uniqueLogs.length >= 5) break;
    }

    if (uniqueLogs.length === 0) {
      logsContainer.innerHTML = '<span class="text-xs text-[#8a8580] italic">Henüz arama geçmişi yok.</span>';
      return;
    }

    logsContainer.innerHTML = uniqueLogs.map((log: any) => {
      const escapedQuery = (log.query || '').replace(/`/g, '\\`').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const displayQuery = log.query.length > 25 ? log.query.substring(0, 22) + '...' : log.query;

      return `
        <div class="inline-flex items-center bg-[#faf9f5] hover:bg-[#14422f]/5 border border-[#ddd9d3] rounded-full pl-3 pr-1 py-0.5 gap-1.5 transition-colors group">
          <button 
            type="button"
            class="flex items-center gap-1 text-[#1b1c1a] text-xs font-semibold select-none hover:text-[#14422f] cursor-pointer" 
            onclick="window.useSearchLogQuery(\`${escapedQuery}\`)" 
            title="${escapedQuery}">
            <span class="material-symbols-outlined text-[13px] text-[#8a8580] group-hover:text-[#14422f]">history</span>
            <span class="truncate max-w-[150px]">${displayQuery}</span>
          </button>
          <button 
            type="button"
            onclick="window.deleteSearchLog('${log.id}', event)" 
            class="p-0.5 text-[#8a8580] hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors cursor-pointer" 
            title="Sil">
            <span class="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>`;
    }).join('');
  } catch (err) {
    console.error("Arama logları çekilemedi:", err);
  }
}
