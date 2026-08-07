/**
 * statsLoader.ts (Admin Dashboard İstatistik Yükleyicisi)
 * Görevi: Admin kontrol panelindeki (Dashboard) Özet Kart verilerini (/api/admin/stats) çeker.
 * Toplam aday sayısı, admin sayısı ve bugün katılan yeni kullanıcı sayılarını canlı gösterir.
 */
export function loadStats(): void {
  const fetcher = async () => {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) throw new Error('Fetch stats error');
    return res.json();
  };

  const render = (data: any) => {
    const set = (id: string, val: any) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val ?? 0);
    };
    set('stat-candidates', data.candidates);
    set('stat-admins', data.admins);
    set('stat-new-users', data.newUsersToday);
  };

  if ((window as any).__swrCache) {
    (window as any).__swrCache.query('dashboard-stats', fetcher, render, 30000);
  } else {
    fetcher().then(render).catch(() => {
      ['stat-candidates', 'stat-admins', 'stat-new-users'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'Hata';
      });
    });
  }
}
