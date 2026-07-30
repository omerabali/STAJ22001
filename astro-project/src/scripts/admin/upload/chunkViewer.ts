/**
 * 5. Chunk Viewer
 * Bir CV'ye tıklandığında veritabanından parçaları çekip gösteren kod (showChunks).
 */
function escapeHtml(str: string): string {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export async function showChunks(cvId: string, fileName: string, activeCvIdState: { activeCvId: string | null }): Promise<void> {
  activeCvIdState.activeCvId = cvId;
  const section = document.getElementById('chunk-viewer-section');
  const title = document.getElementById('chunk-viewer-title');
  const countLabel = document.getElementById('chunk-count-label');
  const list = document.getElementById('chunk-list');
  if (!section || !list || !title || !countLabel) return;

  title.textContent = fileName;
  countLabel.textContent = 'Yükleniyor...';
  list.innerHTML = `<div class="flex items-center justify-center py-10 gap-3 text-[#8a8580]"><span class="material-symbols-outlined animate-spin text-2xl">progress_activity</span><span class="text-sm font-medium">Parçalar getiriliyor...</span></div>`;
  section.classList.remove('hidden');

  try {
    const res = await fetch(`/api/cv/${cvId}/chunks`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const chunks = data.chunks || [];
    countLabel.textContent = `${chunks.length} parça`;
    if (chunks.length === 0) {
      list.innerHTML = `<div class="py-10 text-center text-[#8a8580] text-sm font-medium">Bu CV için henüz parça oluşturulmamış.</div>`;
      return;
    }
    list.innerHTML = '';
    chunks.forEach((chunk: any, i: number) => {
      const div = document.createElement('div');
      div.className = 'border border-[#ddd9d3] rounded-[10px] overflow-hidden text-left bg-[#faf9f5]';
      div.innerHTML = `
        <div class="px-4 py-2.5 border-b border-[#ddd9d3] bg-white flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#14422f]/10 text-[10px] font-black text-[#14422f]">${i + 1}</span>
          <span class="text-[11px] font-bold text-[#8a8580] uppercase tracking-wider">Parça ${chunk.chunkIndex}</span>
        </div>
        <div class="px-4 py-3">
          <p class="text-xs text-[#1b1c1a] font-medium leading-relaxed whitespace-pre-wrap break-words">${escapeHtml(chunk.chunkText)}</p>
        </div>
      `;
      list.appendChild(div);
    });
  } catch {
    list.innerHTML = `<div class="py-8 text-center text-rose-600 text-sm font-medium">Parçalar yüklenirken hata oluştu.</div>`;
  }
}
