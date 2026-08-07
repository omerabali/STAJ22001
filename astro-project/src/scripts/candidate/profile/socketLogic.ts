/**
 * socketLogic.ts (Canlı WebSocket / Socket.io Dinleyici Yöneticisi)
 * Görevi: Backend sunucusundan gelen anlık `analysis:status` olaylarını dinler.
 * CV işlenme adımlarını (1. Yüklendi, 2. İşleniyor, 3. AI Analiz, 4. Hazır) canlı olarak ekrana yansıtır.
 */
import { updateStepUI } from '../../shared/stepperTimeline';
import { showProfileToast } from './toastNotification';

export function initAnalysisSocketListener(state: {
  selectedCvId: string | null;
  isAnalysisCompleted: boolean;
}, loadCVList: () => void) {
  let socket: any = null;
  try {
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    socket = (window as any).io ? (window as any).io(socketUrl, { withCredentials: true }) : null;

    if (!socket) return null;

    socket.on('connect', () => {
      console.log('[Profile Socket.io] 🔌 Connected to server:', socket.id);
    });

    socket.on('disconnect', (reason: string) => {
      if (state.isAnalysisCompleted) return;
      console.warn('[Profile Socket.io] ⚠️ Disconnected:', reason);
    });

    socket.on('analysis:status', (data: any) => {
      console.log('[Profile Socket.io] 📡 Received status update:', data);

      const stepNum = typeof data.step === 'number' ? data.step : 1;

      const stepTitle = document.getElementById('profile-step-title');
      if (data.message && stepTitle) stepTitle.textContent = data.message;

      updateStepUI(stepNum, data.message || '');

      if (data.status === 'COMPLETED' || stepNum >= 4) {
        state.isAnalysisCompleted = true;
        showProfileToast('✅ Analiz Tamamlandı!', 'Sonuçlarınız hazır — aşağıdaki listeden görüntüleyebilirsiniz.');
        const statusIndicator = document.getElementById('analysis-status-indicator');
        if (statusIndicator) {
          statusIndicator.innerHTML = `<span class="material-symbols-outlined text-emerald-600 text-3xl">check_circle</span>`;
        }
      }

      if ((window as any).__swrCache) {
        (window as any).__swrCache.invalidate('user-cvs');
        (window as any).__swrCache.invalidate('user-analyses');
      }
      loadCVList();
    });
  } catch (err) {
    console.error('[Profile Socket.io] Failed to connect:', err);
  }

  return socket;
}
