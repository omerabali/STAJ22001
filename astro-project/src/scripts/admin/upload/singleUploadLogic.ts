/**
 * 7. Single Upload Logic
 * Tekli dosya yükleme olaylarını dinleme ve uploadCV modülüne iletme (setupSingleUpload).
 */
import { uploadCV } from '../../shared/cvUploader';

export function setupSingleUpload(socket: any, loadCVList: () => void): void {
  const dz = document.getElementById('drop-zone-single');
  const input = document.getElementById('cv-file-single') as HTMLInputElement;
  const wrap = document.getElementById('single-progress-wrap');
  const fnEl = document.getElementById('single-file-name');
  const bar = document.getElementById('single-bar');
  const pct = document.getElementById('single-pct');
  const msg = document.getElementById('single-msg');

  function getTargetUserId(): string {
    return (document.getElementById('admin-candidate-select') as HTMLSelectElement)?.value || '';
  }

  function validateFile(file: File): boolean {
    if (file.type !== 'application/pdf') { alert(`Geçersiz dosya: ${file.name}. Sadece PDF yüklenebilir.`); return false; }
    if (file.size > 5 * 1024 * 1024) { alert(`Dosya boyutu fazla: ${file.name} (Maks 5MB)`); return false; }
    return true;
  }

  function doUpload(file: File) {
    if (!validateFile(file) || !fnEl || !bar || !pct || !msg || !wrap) return;
    
    fnEl.textContent = file.name;
    bar.style.width = '0%';
    bar.style.backgroundColor = '';
    pct.textContent = '0%';
    msg.textContent = 'Yükleniyor...';
    msg.className = 'text-[10px] text-[#8a8580] font-medium mt-1.5';
    wrap.classList.remove('hidden');

    uploadCV({
      file,
      targetUserId: getTargetUserId(),
      onProgress: (p, overallPct) => {
        bar.style.width = overallPct + '%';
        pct.textContent = overallPct + '%';
        msg.textContent = p < 100 ? `Dosya sunucuya gönderiliyor... %${p}` : 'Sunucu işliyor, analiz başlatılıyor...';
      },
      onSuccess: (data) => {
        msg.textContent = 'CV başarıyla yüklendi, analiz sıraya alındı...';
        msg.className = 'text-[10px] font-semibold text-[#14422f] mt-1.5';
        if (socket && data.cv?.id) {
          socket.emit('join:cv', data.cv.id);
          console.log('[Admin Upload] 📡 Joined socket room:', data.cv.id);
        }
        loadCVList();
      },
      onError: (m) => {
        msg.textContent = 'Hata: ' + m;
        msg.className = 'text-[10px] font-bold text-rose-600 mt-1.5';
        bar.style.backgroundColor = 'rgba(239,68,68,0.5)';
        bar.style.width = '100%';
      }
    });
  }

  dz?.addEventListener('click', () => input?.click());
  dz?.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('border-[#14422f]','bg-[#14422f]/[0.03]'); });
  dz?.addEventListener('dragleave', () => dz.classList.remove('border-[#14422f]','bg-[#14422f]/[0.03]'));
  dz?.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('border-[#14422f]','bg-[#14422f]/[0.03]'); if (e.dataTransfer?.files?.[0]) doUpload(e.dataTransfer.files[0]); });
  input?.addEventListener('change', () => { if (input.files?.[0]) doUpload(input.files[0]); });
}
