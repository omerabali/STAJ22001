/**
 * searchLogger.ts
 * Manages background fetching & optimistic deletion of search history pills.
 */

export async function fetchSearchLogs(containerId: string = 'search-logs-list', onPillClick?: (query: string) => void): Promise<void> {
  const logsContainer = document.getElementById(containerId);
  if (!logsContainer) return;
  try {
    const res = await fetch('/api/search/logs');
    if (!res.ok) throw new Error("Arama geçmişi alınamadı.");
    const logs = await res.json();
    const recentLogs = logs.slice(0, 5);

    if (recentLogs.length === 0) {
      logsContainer.innerHTML = '<span class="text-xs text-[#8a8580] italic">Henüz arama geçmişi yok.</span>';
      return;
    }

    logsContainer.innerHTML = recentLogs.map((log: any) => 
      `<div class="inline-flex items-center bg-[#faf9f5] hover:bg-[#14422f]/5 border border-[#ddd9d3] rounded-full pl-3 pr-1 py-0.5 gap-1.5 transition-colors group">
        <button class="flex items-center gap-1 text-[#1b1c1a] text-xs font-semibold select-none hover:text-[#14422f]" onclick="document.getElementById('semantic-search-input').value = \`${log.query.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`; executeSemanticSearch();" title="${log.query}">
          <span class="material-symbols-outlined text-[13px] text-[#8a8580] group-hover:text-[#14422f]">history</span>
          <span class="truncate max-w-[140px]">${log.query}</span>
        </button>
        <button onclick="deleteSearchLog('${log.id}', event)" class="p-0.5 text-[#8a8580] hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors" title="Sil">
          <span class="material-symbols-outlined text-[14px]">close</span>
        </button>
      </div>`
    ).join('');
  } catch (err) {
    console.error("Arama geçmişi çekilemedi:", err);
  }
}

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
