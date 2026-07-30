/**
 * exportCSV.ts -> Excel Export Utility & Timeframe Filter Manager
 * Seçili zaman filtresine (Bu Hafta, Bu Ay, Tüm Zamanlar) göre aday ve analiz verilerini
 * Microsoft Excel (.xls) tablosu olarak indirir ve ekrandaki grafikleri & tabloları günceller.
 */
import { loadRecentAnalyses } from './recentAnalysesLoader';
import { loadReports } from './reportStatsLoader';

let activeTimeframe: 'week' | 'month' | 'all' = 'week';

export function setReportTimeframe(timeframe: 'week' | 'month' | 'all'): void {
  console.log(`[Reports] Zaman filtresi değiştirildi: ${timeframe}`);
  activeTimeframe = timeframe;
  updateTimeframeButtonsUI();
  
  // Ekrandaki kartları, grafikleri ve tabloyu seçili zamana göre güncelle
  loadRecentAnalyses(timeframe);
  loadReports(timeframe);
}

export function getTimeframeLabel(): string {
  if (activeTimeframe === 'week') return 'Bu Hafta';
  if (activeTimeframe === 'month') return 'Bu Ay';
  return 'Tüm Zamanlar';
}

function updateTimeframeButtonsUI(): void {
  const btnWeek = document.getElementById('filter-week');
  const btnMonth = document.getElementById('filter-month');
  const btnAll = document.getElementById('filter-all');

  [btnWeek, btnMonth, btnAll].forEach(btn => {
    if (!btn) return;
    btn.className = 'px-3 py-1.5 rounded-md text-[#8a8580] hover:text-[#1b1c1a] transition-colors cursor-pointer text-xs font-semibold';
  });

  const activeBtn = activeTimeframe === 'week' ? btnWeek : activeTimeframe === 'month' ? btnMonth : btnAll;
  if (activeBtn) {
    activeBtn.className = 'px-3 py-1.5 rounded-md bg-white shadow-sm border border-[#ddd9d3] text-[#14422f] font-bold cursor-pointer text-xs';
  }
}

export async function executeExportExcel(): Promise<void> {
  console.log(`[Reports] Excel indirme başlatıldı. Seçili zaman filtresi: ${activeTimeframe}`);
  try {
    const res = await fetch('/api/admin/candidates');
    if (!res.ok) throw new Error('Candidates fetch error');
    const data = await res.json();
    const candidates = data.candidates || [];

    const now = new Date();
    const cutoffDate = new Date();

    if (activeTimeframe === 'week') {
      cutoffDate.setDate(now.getDate() - 7);
    } else if (activeTimeframe === 'month') {
      cutoffDate.setDate(now.getDate() - 30);
    } else {
      cutoffDate.setTime(0); // Tüm zamanlar
    }

    // Filtreye uygun adayları seç
    const filteredCandidates = candidates.filter((cand: any) => {
      const dateStr = cand.latestCvDate || cand.createdAt;
      if (!dateStr) return true;
      return new Date(dateStr) >= cutoffDate;
    });

    const filterTitle = getTimeframeLabel();
    const currentDateStr = new Date().toLocaleString('tr-TR');

    // Microsoft Excel HTML Table (.xls) Formatı
    let excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Beacon Raporu</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #14422f; color: #ffffff; font-weight: bold; border: 1px solid #14422f; padding: 10px; text-align: left; }
          td { border: 1px solid #ddd9d3; padding: 8px; text-align: left; font-size: 13px; }
          .title-header { font-size: 16px; font-weight: bold; color: #14422f; }
          .meta-text { font-size: 11px; color: #555555; }
        </style>
      </head>
      <body>
        <div class="title-header">Beacon Platformu - CV ve Aday Analiz Raporu</div>
        <div class="meta-text">Zaman Aralığı Filtresi: <b>${filterTitle}</b> | Rapor Oluşturulma Tarihi: ${currentDateStr}</div>
        <br/>
        <table>
          <thead>
            <tr>
              <th>Aday Adı Soyadı</th>
              <th>E-Posta Adresi</th>
              <th>Yüklenen CV Dosyası</th>
              <th>Kayıt / Yükleme Tarihi</th>
              <th>ATS Başarı Skoru</th>
              <th>Analiz Durumu</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredCandidates.length === 0) {
      excelHtml += `
        <tr>
          <td colspan="6" style="text-align: center; color: #888;">Bu zaman aralığına ait kayıt bulunamadı.</td>
        </tr>
      `;
    } else {
      filteredCandidates.forEach((cand: any) => {
        const cvName = cand.latestCvName || (cand.cvs && cand.cvs[0]?.fileName) || 'CV Yüklenmedi';
        const rawDate = cand.latestCvDate || cand.createdAt;
        const dateStr = rawDate ? new Date(rawDate).toLocaleDateString('tr-TR') : '-';
        const atsScore = cand.atsScore !== undefined && cand.atsScore !== null ? `%${cand.atsScore}` : '-';
        const status = cand.analysisStatus || (cand.cvCount > 0 ? 'Analiz Hazır' : 'CV Yok');

        excelHtml += `
          <tr>
            <td>${cand.name || '-'}</td>
            <td>${cand.email || '-'}</td>
            <td>${cvName}</td>
            <td>${dateStr}</td>
            <td><b>${atsScore}</b></td>
            <td>${status}</td>
          </tr>
        `;
      });
    }

    excelHtml += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Excel UTF-8 BOM ile indir
    const blob = new Blob(['\ufeff', excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileNameStr = `Beacon_Aday_Raporu_${filterTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xls`;
    link.download = fileNameStr;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error('Export Excel error:', err);
    alert('Rapor indirilirken hata oluştu.');
  }
}

export function initExportCSV(): void {
  const btnWeek = document.getElementById('filter-week');
  const btnMonth = document.getElementById('filter-month');
  const btnAll = document.getElementById('filter-all');
  const exportBtn = document.getElementById('export-excel-btn');

  btnWeek?.addEventListener('click', () => setReportTimeframe('week'));
  btnMonth?.addEventListener('click', () => setReportTimeframe('month'));
  btnAll?.addEventListener('click', () => setReportTimeframe('all'));

  exportBtn?.addEventListener('click', () => executeExportExcel());

  // Global window erişimi
  (window as any).exportCSV = executeExportExcel;
  (window as any).setReportTimeframe = setReportTimeframe;
}
