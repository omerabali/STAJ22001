/**
 * cvChartRenderer.ts (Raporlar Haftalık Grafik Çizici)
 * Görevi: Raporlar sayfasındaki son 7 günün CV yükleme sayılarını
 * dinamik ve görsel bir çubuk grafik (bar chart) halinde ekrana çizer.
 */
export function renderCVChart(recentCvUploads: any[]): void {
  const chart = document.getElementById('cv-bars-container');
  const labels = document.getElementById('cv-bars-labels');
  if (!chart || !labels) return;

  const days: Array<{ key: string; label: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = recentCvUploads
      ? recentCvUploads.find((r: any) => r.day && r.day.slice(0, 10) === key)
      : null;
    days.push({ key, label: d.toLocaleDateString('tr-TR', { weekday: 'short' }), count: found ? found.count : 0 });
  }

  const maxCount = Math.max(...days.map(d => d.count), 5);

  const setY = (id: string, val: number) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(Math.round(val));
  };
  setY('chart-y-4', maxCount);
  setY('chart-y-3', maxCount * 0.75);
  setY('chart-y-2', maxCount * 0.5);
  setY('chart-y-1', maxCount * 0.25);

  chart.innerHTML = days.map(d => {
    const h = Math.round((d.count / maxCount) * 100);
    return `
      <div class="flex flex-col items-center gap-1.5 group flex-1 h-full justify-end relative">
        <span class="text-[9px] font-bold text-[#8a8580] opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">${d.count}</span>
        <div class="w-8 rounded-t-[4px] transition-all duration-700 hover:bg-[#14422f] cursor-pointer" 
             style="height: ${Math.max(h, 4)}%; background: ${d.count > 0 ? '#2D5A45' : '#ddd9d3'}; opacity: ${d.count > 0 ? 1 : 0.4};"
             title="${d.count} CV yükleme">
        </div>
      </div>
    `;
  }).join('');

  labels.innerHTML = days.map(d =>
    `<span class="w-8 text-center font-bold text-[10px] text-[#8a8580]">${d.label}</span>`
  ).join('');
}
