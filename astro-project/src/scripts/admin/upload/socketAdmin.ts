/**
 * socketAdmin.ts (Admin Yükleme Sayfası Canlı WebSocket Dinleyici)
 * Görevi: Backend sunucusundan gelen canlı `admin:cv_status` ve `admin:batch_status` olaylarını dinler.
 * Toplu yüklenen CV'lerin işlenme durumlarını sayfayı yenilemeye gerek kalmadan canlı günceller.
 */
export function initAdminSocket(loadCVList: () => void) {
  let socket: any = null;
  try {
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    socket = (window as any).io ? (window as any).io(socketUrl, { withCredentials: true }) : null;

    if (!socket) return null;

    socket.on('connect', () => {
      console.log('[Admin Upload Socket.io] 🔌 Connected to server:', socket.id);
    });

    socket.on('analysis:status', (data: any) => {
      console.log('[Admin Upload Socket.io] 📡 Received status update:', data);

      const stepNum = typeof data.step === 'number' ? data.step : 1;
      const pct = Math.min(Math.round((stepNum / 4) * 100), 100);

      const bar = document.getElementById('single-bar');
      const pctEl = document.getElementById('single-pct');
      const msg = document.getElementById('single-msg');

      if (bar) bar.style.width = `${pct}%`;
      if (pctEl) pctEl.textContent = `${pct}%`;
      if (msg && data.message) msg.textContent = data.message;

      if (data.status === 'COMPLETED' || stepNum >= 4) {
        if (msg) {
          msg.textContent = 'Analiz başarıyla tamamlandı!';
          msg.className = 'text-[10px] font-bold text-emerald-600 mt-1.5';
        }
        if (bar) bar.style.width = '100%';
        if (pctEl) pctEl.textContent = '100%';
        loadCVList();
      } else if (data.status === 'FAILED') {
        if (msg) {
          msg.textContent = 'Hata: Analiz başarısız oldu.';
          msg.className = 'text-[10px] font-bold text-rose-600 mt-1.5';
        }
        if (bar) bar.style.backgroundColor = 'rgba(239,68,68,0.5)';
        loadCVList();
      }

      if (data.cvId) {
        const bulkItem = document.querySelector(`.bulk-item[data-cv-id="${data.cvId}"]`);
        if (bulkItem) {
          const bBar = bulkItem.querySelector('.item-bar') as HTMLElement;
          const bPct = bulkItem.querySelector('.item-pct');
          const bMsg = bulkItem.querySelector('.item-msg');
          if (bBar) bBar.style.width = `${pct}%`;
          if (bPct) bPct.textContent = `${pct}%`;
          if (bMsg && data.message) bMsg.textContent = data.message;
          if (data.status === 'COMPLETED') {
            if (bMsg) {
              bMsg.textContent = 'Analiz tamamlandı!';
              bMsg.className = 'text-[10px] font-bold text-emerald-600 item-msg';
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('[Admin Upload Socket.io] Failed to connect:', err);
  }
  return socket;
}
