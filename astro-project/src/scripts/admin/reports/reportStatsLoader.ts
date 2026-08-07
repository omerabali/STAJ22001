/**
 * reportStatsLoader.ts (Raporlar Genel İstatistik Yükleyici)
 * Görevi: Backend'den (`/api/admin/reports`) detaylı sistem analitiğini (ortalama ATS skoru,
 * toplam yüklenen CV sayısı, aktif aday yüzdeleri) çeker ve ekrandaki sayaçları günceller.
 */
import { renderCVChart } from './cvChartRenderer';
import { reportsState } from './reportsState';

function pct(val: number, total: number): number {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}

let activePeriod = 'week';

/**
 * Rapor istatistiklerini (donut chart, stat kartları, haftalık bar, AI cost ve Top yetenekler) yükler.
 */
export function loadReports(period: string = 'week'): void {
  activePeriod = period;

  // Filtre buton şık aktif durumlari
  const weekBtn = document.getElementById('filter-week');
  const monthBtn = document.getElementById('filter-month');
  const allBtn = document.getElementById('filter-all');

  [weekBtn, monthBtn, allBtn].forEach(btn => {
    if (btn) {
      btn.className = 'px-3 py-1.5 rounded-md text-[#8a8580] hover:text-[#1b1c1a] transition-colors cursor-pointer';
    }
  });

  const activeBtn = period === 'month' ? monthBtn : period === 'all' ? allBtn : weekBtn;
  if (activeBtn) {
    activeBtn.className = 'px-3 py-1.5 rounded-md bg-white shadow-sm border border-[#ddd9d3] text-[#14422f] font-bold cursor-pointer';
  }

  const fetcher = async () => {
    const [statsRes, costRes] = await Promise.all([
      fetch(`/api/admin/reports/stats?period=${period}`),
      fetch('/api/admin/cost-report').catch(() => null)
    ]);

    if (!statsRes.ok) throw new Error('Fetch reports stats error');
    const statsData = await statsRes.json();
    const costData = costRes && costRes.ok ? await costRes.json() : null;

    return { stats: statsData, cost: costData };
  };

  const render = ({ stats, cost }: { stats: any; cost: any }) => {
    reportsState.reportData = stats;

    const set = (id: string, val: any) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val ?? '-');
    };

    set('r-total-cvs', stats.totalCVs ?? '-');
    set('r-completed', stats.completedAnalyses ?? '-');
    set('r-avg-score', stats.avgAtsScore !== null ? `%${stats.avgAtsScore}` : '-');

    const weeklySum = stats.weeklyUploadsCount ?? (stats.recentCvUploads
      ? stats.recentCvUploads.reduce((sum: number, item: any) => sum + item.count, 0)
      : 0);
    set('r-weekly-uploads', weeklySum);

    const periodTitleEl = document.getElementById('r-period-label');
    if (periodTitleEl) {
      periodTitleEl.textContent = period === 'month' ? 'BU AY YÜKLENEN' : period === 'all' ? 'TÜM ZAMANLAR YÜKLENEN' : 'BU HAFTA YÜKLENEN';
    }

    // AI Cost Metrics
    if (cost && cost.summary) {
      const totalUsd = cost.summary.totalCostUsd ? `$${cost.summary.totalCostUsd.toFixed(4)}` : '$0.00';
      const totalTokens = cost.summary.totalTokens ? `${(cost.summary.totalTokens / 1000).toFixed(1)}K` : '0';
      const successRate = cost.summary.totalCalls > 0 
        ? `%${Math.round((cost.summary.successCalls / cost.summary.totalCalls) * 100)}` 
        : '%100';

      set('cost-total-usd', totalUsd);
      set('cost-total-tokens', totalTokens);
      set('cost-success-rate', successRate);
    } else {
      set('cost-total-usd', '$0.00');
      set('cost-total-tokens', '0');
      set('cost-success-rate', '%100');
    }

    // Top Skills Render
    const topSkillsContainer = document.getElementById('top-skills-container');
    if (topSkillsContainer && Array.isArray(stats.topSkills)) {
      if (stats.topSkills.length === 0) {
        topSkillsContainer.innerHTML = `<span class="text-xs text-[#8a8580]">Henüz öne çıkan yetenek verisi yok.</span>`;
      } else {
        const maxCount = Math.max(...stats.topSkills.map((s: any) => s.count), 1);
        topSkillsContainer.innerHTML = stats.topSkills.map((s: any) => {
          const widthPct = Math.round((s.count / maxCount) * 100);
          return `
            <div class="flex flex-col gap-1">
              <div class="flex justify-between text-xs font-semibold text-[#1c1b19]">
                <span>${s.skill}</span>
                <span class="text-[#14422f]">${s.count} aday</span>
              </div>
              <div class="w-full h-2 bg-[#f5f4f0] rounded-full overflow-hidden">
                <div class="h-full bg-[#14422f] rounded-full" style="width: ${Math.max(widthPct, 8)}%"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Donut Chart
    const total = stats.totalAnalyses || 0;
    const cp = pct(stats.completedAnalyses, total);
    const pp = pct(stats.processingAnalyses, total);
    const ep = pct(stats.pendingAnalyses, total);

    set('donut-center-total', total);
    set('legend-completed', cp + '%');
    set('legend-processing', pp + '%');
    set('legend-pending', ep + '%');

    const compCircle = document.getElementById('donut-completed');
    const procCircle = document.getElementById('donut-processing');
    const pendCircle = document.getElementById('donut-pending');

    if (compCircle && procCircle && pendCircle) {
      compCircle.setAttribute('stroke-dasharray', `${cp} 100`);
      compCircle.setAttribute('stroke-dashoffset', '0');
      procCircle.setAttribute('stroke-dasharray', `${pp} 100`);
      procCircle.setAttribute('stroke-dashoffset', `-${cp}`);
      pendCircle.setAttribute('stroke-dasharray', `${ep} 100`);
      pendCircle.setAttribute('stroke-dashoffset', `-${cp + pp}`);
    }

    renderCVChart(stats.recentCvUploads);
  };

  fetcher().then(render).catch((err: any) => console.error('Reports stats failed:', err));
}
