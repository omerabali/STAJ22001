import { candProfileState } from './candProfileState';

/**
 * Socket.io bağlantısı — CV durumu ve analiz tamamlanma event'leri dinler.
 */
export function setupRealtimeSocket(userId: string, reloadFn: () => void): void {
  if (typeof (window as any).io === 'undefined') return;

  try {
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/';
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
