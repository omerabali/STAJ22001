import { adminProfileState } from './adminProfileState';

/**
 * Tab switching — fulltext / chunks arası geçiş.
 */
export function setupTabSwitching(): void {
  const tabFulltext = document.getElementById('tab-fulltext');
  const tabChunks = document.getElementById('tab-chunks');
  if (!tabFulltext || !tabChunks) return;
  tabFulltext.onclick = () => switchCvViewTab('fulltext');
  tabChunks.onclick = () => switchCvViewTab('chunks');
}

export function switchCvViewTab(tab: string): void {
  adminProfileState.currentViewTab = tab;
  const tabFulltext = document.getElementById('tab-fulltext');
  const tabChunks = document.getElementById('tab-chunks');
  const fulltextContent = document.getElementById('cv-fulltext-content');
  const chunksContent = document.getElementById('cv-chunks-content');

  if (tab === 'fulltext') {
    if (tabFulltext) tabFulltext.className = 'pb-2 border-b-2 border-[#14422f] text-[#14422f] font-bold cursor-pointer flex items-center gap-1.5';
    if (tabChunks) tabChunks.className = 'pb-2 border-b-2 border-transparent text-[#8a8580] hover:text-[#1b1c1a] cursor-pointer flex items-center gap-1.5';
    if (fulltextContent) { fulltextContent.classList.remove('hidden'); fulltextContent.classList.add('flex'); }
    if (chunksContent) { chunksContent.classList.add('hidden'); chunksContent.classList.remove('flex'); }
  } else {
    if (tabChunks) tabChunks.className = 'pb-2 border-b-2 border-[#14422f] text-[#14422f] font-bold cursor-pointer flex items-center gap-1.5';
    if (tabFulltext) tabFulltext.className = 'pb-2 border-b-2 border-transparent text-[#8a8580] hover:text-[#1b1c1a] cursor-pointer flex items-center gap-1.5';
    if (chunksContent) { chunksContent.classList.remove('hidden'); chunksContent.classList.add('flex'); }
    if (fulltextContent) { fulltextContent.classList.add('hidden'); fulltextContent.classList.remove('flex'); }
  }
}
