/**
 * 8. Bulk Upload Engine
 * Toplu Dosya Adından Aday İsmi Çıkarma regex motoru ve toplu yükleme kuyruğu (setupBulkUpload).
 */
import { uploadCV } from '../../shared/cvUploader';
import { getAllCandidates } from './candidateSelector.ts';

export function parseNameFromFilename(filename: string): string | null {
  let name = filename.replace(/\.[^.]+$/, '');
  name = name.replace(/\b(cv|resume|ozgecmis|özgecmis|portfolio|staj|intern|application|basvuru|2024|2025|2026|final|v\d+|\d+)\b/gi, '');
  name = name.replace(/[_\-\.]+/g, ' ').trim();
  name = name.replace(/\s+/g, ' ').trim();
  return name.length >= 2 ? name : null;
}

export function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9 ]/g, '').trim();
}

export function setupBulkUpload(socket: any, loadCVList: () => void): void {
  const dz = document.getElementById('drop-zone-bulk');
  const input = document.getElementById('cv-file-bulk') as HTMLInputElement;
  const wrap = document.getElementById('bulk-queue-wrap');
  const list = document.getElementById('bulk-progress-list');
  const uploadAllBtn = document.getElementById('bulk-upload-btn');

  let queueItems: { id: string; file: File; targetUserId: string; status: string }[] = [];

  function matchCandidate(filename: string): string {
    const parsed = parseNameFromFilename(filename);
    if (!parsed) return '';
    const normParsed = normalize(parsed);
    const allCandidates = getAllCandidates();
    const found = allCandidates.find(c => {
      const normName = normalize(c.name || '');
      const normEmail = normalize(c.email || '');
      return (normName && (normName.includes(normParsed) || normParsed.includes(normName))) ||
             (normEmail && normEmail.includes(normParsed));
    });
    return found ? found.id : '';
  }

  function handleFiles(files: FileList) {
    Array.from(files).forEach(file => {
      if (file.type !== 'application/pdf') return;
      const itemId = 'bulk-' + Math.random().toString(36).substring(2, 9);
      const autoMatchId = matchCandidate(file.name);
      queueItems.push({ id: itemId, file, targetUserId: autoMatchId, status: 'WAITING' });
    });
    renderQueue();
  }

  function renderQueue() {
    if (!wrap || !list || !uploadAllBtn) return;
    if (queueItems.length === 0) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');

    const allCandidates = getAllCandidates();
    const optionsHtml = `<option value="">Admin (Ben)</option>` +
      allCandidates.map(c => `<option value="${c.id}">${c.name ? `${c.name} — ${c.email}` : c.email}</option>`).join('');

    list.innerHTML = queueItems.map(item => `
      <div class="bulk-item p-3 border border-[#ddd9d3] bg-[#faf9f5] rounded-lg space-y-2 text-left" data-id="${item.id}" data-cv-id="">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 truncate">
            <span class="material-symbols-outlined text-red-500 text-[18px] shrink-0">picture_as_pdf</span>
            <span class="text-xs font-bold text-[#1b1c1a] truncate max-w-[150px]">${item.file.name}</span>
          </div>
          <select class="bulk-user-select text-[11px] bg-white border border-[#ddd9d3] rounded px-2 py-1 text-[#1b1c1a] font-medium max-w-[170px]" data-item-id="${item.id}">
            ${optionsHtml}
          </select>
        </div>
        <div class="w-full bg-[#ddd9d3]/40 h-1.5 rounded-full overflow-hidden">
          <div class="item-bar h-full bg-[#14422f] w-0 transition-all rounded-full"></div>
        </div>
        <div class="flex items-center justify-between text-[10px]">
          <span class="item-msg text-[#8a8580] font-medium">Sırada bekleniyor...</span>
          <span class="item-pct font-mono font-bold text-[#14422f]">0%</span>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.bulk-user-select').forEach(sel => {
      const selectEl = sel as HTMLSelectElement;
      const itemId = selectEl.dataset.itemId;
      const item = queueItems.find(i => i.id === itemId);
      if (item) {
        selectEl.value = item.targetUserId;
        selectEl.addEventListener('change', () => { item.targetUserId = selectEl.value; });
      }
    });

    uploadAllBtn.onclick = () => processBulkQueue();
  }

  async function processBulkQueue() {
    if (!uploadAllBtn) return;
    uploadAllBtn.setAttribute('disabled', 'true');

    for (const item of queueItems) {
      if (item.status !== 'WAITING') continue;
      item.status = 'UPLOADING';
      const el = list?.querySelector(`.bulk-item[data-id="${item.id}"]`);
      const bar = el?.querySelector('.item-bar') as HTMLElement;
      const pct = el?.querySelector('.item-pct');
      const msg = el?.querySelector('.item-msg');

      await new Promise<void>((resolve) => {
        uploadCV({
          file: item.file,
          targetUserId: item.targetUserId,
          onProgress: (p, overallPct) => {
            if (bar) bar.style.width = overallPct + '%';
            if (pct) pct.textContent = overallPct + '%';
            if (msg) msg.textContent = p < 100 ? `Gönderiliyor %${p}` : 'Sunucu işliyor...';
          },
          onSuccess: (data) => {
            item.status = 'DONE';
            if (data.cv?.id && el) el.setAttribute('data-cv-id', data.cv.id);
            if (msg) {
              msg.textContent = 'CV Yüklendi, Analiz Başlatıldı...';
              msg.className = 'item-msg text-[10px] font-semibold text-[#14422f]';
            }
            if (socket && data.cv?.id) socket.emit('join:cv', data.cv.id);
            loadCVList();
            resolve();
          },
          onError: (m) => {
            item.status = 'FAILED';
            if (msg) {
              msg.textContent = 'Hata: ' + m;
              msg.className = 'item-msg text-[10px] font-bold text-rose-600';
            }
            if (bar) bar.style.backgroundColor = 'rgba(239,68,68,0.5)';
            resolve();
          }
        });
      });
    }

    uploadAllBtn.removeAttribute('disabled');
    loadCVList();

    const doneItems = queueItems.filter(i => i.status === 'DONE');
    if (doneItems.length > 0) {
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-6 right-6 z-50 bg-[#14422f] text-white px-5 py-4 rounded-[14px] shadow-2xl border border-emerald-500/30 flex items-center gap-3 animate-bounce';
      toast.innerHTML = `
        <span class="material-symbols-outlined text-emerald-400 text-xl">cloud_done</span>
        <div>
          <h5 class="text-xs font-bold">Toplu Yükleme Tamamlandı! 🎉</h5>
          <p class="text-[11px] text-gray-200 mt-0.5">${doneItems.length} adet CV yüklendi ve yapay zeka analizine alındı.</p>
        </div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    }
  }

  dz?.addEventListener('click', () => input?.click());
  dz?.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('border-[#14422f]','bg-[#14422f]/[0.03]'); });
  dz?.addEventListener('dragleave', () => dz.classList.remove('border-[#14422f]','bg-[#14422f]/[0.03]'));
  dz?.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('border-[#14422f]','bg-[#14422f]/[0.03]'); if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files); });
  input?.addEventListener('change', () => { if (input.files?.length) handleFiles(input.files); });
}
