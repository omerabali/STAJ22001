import { renderCVChart } from './cvChartRenderer';
import { reportsState } from './reportsState';

function pct(val: number, total: number): number {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}

/**
 * Rapor istatistiklerini (donut chart, stat kartları, haftalık bar) yükler ve render eder.
 */
export function loadReports(timeframe: 'week' | 'month' | 'all' = 'all'): void {
  const fetcher = async () => {
    const res = await fetch('/api/admin/reports/stats');
    if (!res.ok) throw new Error('Fetch reports stats error');
    return res.json();
  };

  const render = (data: any) => {
    reportsState.reportData = data;

    const set = (id: string, val: any) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val ?? '-');
    };

    set('r-total-cvs', data.totalCVs ?? '-');
    set('r-completed', data.completedAnalyses ?? '-');
    set('r-avg-score', data.avgAtsScore !== null ? `%${data.avgAtsScore}` : '-');

    const weeklySum = data.recentCvUploads
      ? data.recentCvUploads.reduce((sum: number, item: any) => sum + item.count, 0)
      : 0;
    set('r-weekly-uploads', weeklySum);

    const total = data.totalAnalyses || 0;
    const cp = pct(data.completedAnalyses, total);
    const pp = pct(data.processingAnalyses, total);
    const ep = pct(data.pendingAnalyses, total);

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

    renderCVChart(data.recentCvUploads);
  };

  fetcher().then(render).catch(console.error);
}
