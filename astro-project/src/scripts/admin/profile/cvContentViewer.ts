import { SECTION_COLORS, DEF_COLOR } from './sectionColors';
import { setupTabSwitching, switchCvViewTab } from './cvViewTabs';

/**
 * CV içerik görüntüleyici — API'den chunk'ları çeker, fulltext + chunk kartları oluşturur.
 */
export async function showCvContent(cv: any): Promise<void> {
  const placeholder = document.getElementById('cv-viewer-placeholder');
  const tabs = document.getElementById('cv-view-tabs');
  const fulltextContent = document.getElementById('cv-fulltext-content');
  const chunksContent = document.getElementById('cv-chunks-content');
  const loading = document.getElementById('cv-viewer-loading');
  const title = document.getElementById('cv-viewer-title');
  const copyBtn = document.getElementById('copy-cv-text-btn');
  if (!placeholder || !fulltextContent || !chunksContent || !loading || !title) return;

  placeholder.classList.add('hidden');
  fulltextContent.classList.add('hidden'); fulltextContent.classList.remove('flex');
  chunksContent.classList.add('hidden'); chunksContent.classList.remove('flex');
  loading.classList.remove('hidden'); loading.classList.add('flex');
  if (copyBtn) copyBtn.classList.add('hidden');
  if (tabs) tabs.classList.add('hidden');
  title.textContent = cv.fileName || 'CV İçeriği';

  try {
    const res = await fetch(`/api/cv/${cv.id}/chunks`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const chunks = data.chunks || [];

    loading.classList.add('hidden'); loading.classList.remove('flex');

    if (chunks.length === 0) {
      fulltextContent.innerHTML = '<div class="text-center py-12 text-sm text-[#8a8580]">Bu CV için henüz içerik oluşturulmamış.</div>';
      fulltextContent.classList.remove('hidden'); fulltextContent.classList.add('flex');
      if (copyBtn) copyBtn.classList.add('hidden');
    } else {
      const fullText = chunks.map((c: any) => {
        const sec = (c.metadata && c.metadata.section) || 'Genel';
        const txt = (c.chunkText || '').replace(/^\[[^\]]+\]\n?/, '').trim();
        return `--- ${sec.toUpperCase()} ---\n${txt}`;
      }).join('\n\n');

      (window as any).__currentCvText = fullText;
      fulltextContent.textContent = fullText;

      chunksContent.innerHTML = chunks.map((chunk: any) => {
        const section = (chunk.metadata && chunk.metadata.section) || 'Genel';
        const c = SECTION_COLORS[section] || DEF_COLOR;
        const conf = chunk.metadata && chunk.metadata.confidence != null
          ? Math.round(chunk.metadata.confidence * 100) + '%' : null;
        const rawText = (chunk.chunkText || '').replace(/^\[[^\]]+\]\n?/, '').trim();
        return `
          <div class="rounded-[10px] border ${c.border} ${c.bg} overflow-hidden shadow-xs">
            <div class="flex items-center justify-between px-3.5 py-2 border-b ${c.border}">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[15px] ${c.text}">${c.icon}</span>
                <span class="text-xs font-bold ${c.text} uppercase tracking-wider">${section}</span>
              </div>
              ${conf ? `<span class="text-[10px] font-semibold ${c.text} opacity-60">Güven: ${conf}</span>` : ''}
            </div>
            <pre class="px-3.5 py-3 text-xs text-[#1b1c1a] leading-relaxed font-sans whitespace-pre-wrap break-words">${rawText}</pre>
          </div>`;
      }).join('');

      if (tabs) { tabs.classList.remove('hidden'); setupTabSwitching(); }
      switchCvViewTab('fulltext');

      if (copyBtn) {
        copyBtn.classList.remove('hidden'); copyBtn.classList.add('flex');
        copyBtn.onclick = () => {
          if ((window as any).__currentCvText) {
            navigator.clipboard.writeText((window as any).__currentCvText);
            const label = document.getElementById('copy-cv-text-label');
            if (label) { label.textContent = 'Kopyalandı! ✅'; setTimeout(() => { label.textContent = 'Metni Kopyala'; }, 2000); }
          }
        };
      }
    }
  } catch {
    loading.classList.add('hidden'); loading.classList.remove('flex');
    if (copyBtn) copyBtn.classList.add('hidden');
    fulltextContent.innerHTML = '<div class="text-center py-8 text-rose-600 text-sm">CV içeriği yüklenemedi.</div>';
    fulltextContent.classList.remove('hidden'); fulltextContent.classList.add('flex');
  }
}
