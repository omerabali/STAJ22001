/**
 * socketSetup.ts (Admin Canlı WebSocket Olay Yöneticisi)
 * Görevi: İncelenen adayın CV durumlarını (cv_status_updated, cv_analysis_completed) canlı dinler.
 * Analiz tamamlandığında sayfayı yenilemeden verileri canlı günceller.
 */
import { candProfileState } from './candProfileState';
export function setupRealtimeSocket(userId: string, reloadFn: () => void): void {
  if (typeof (window as any).io === 'undefined') return;

  try {
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://cv-parser-backend-38di.onrender.com';
    const socket = (window as any).io(socketUrl, { transports: ['websocket', 'polling'] });
    const indicator = document.getElementById('live-socket-indicator');

    socket.on('connect', () => {
      if (indicator) { indicator.classList.remove('hidden'); indicator.classList.add('flex'); }
      if (userId) socket.emit('join_user_room', userId);
    });

    socket.on('cv_status_updated', (data: any) => {
      if (data && (data.cvId === candProfileState.activeCvId || data.userId === userId)) reloadFn();
    });

    socket.on('cv_analysis_completed', (data: any) => {
      if (data && (data.cvId === candProfileState.activeCvId || data.userId === userId)) reloadFn();
    });
  } catch (err) {
    console.log('Socket connection error:', err);
  }
}
