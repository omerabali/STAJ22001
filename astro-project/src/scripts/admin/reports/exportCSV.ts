/**
 * exportCSV.ts -> Excel Export Utility
 * Seçili zaman filtresine (Bu Hafta, Bu Ay, Tüm Zamanlar) göre aday ve analiz verilerini Microsoft Excel (.xlsx / .xls) tablosu olarak indirir.
 */

let activeTimeframe: 'week' | 'month' | 'all' = 'week';

export function setReportTimeframe(timeframe: 'week' | 'month' | 'all'): void {
  activeTimeframe = timeframe;
  updateTimeframeButtonsUI();
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
    btn.className = 'px-3 py-1.5 rounded-md text-[#8a8580] hover:text-[#1b1c1a] transition-colors cursor-pointer';
  });

  const activeBtn = activeTimeframe === 'week' ? btnWeek : activeTimeframe === 'month' ? btnMonth : btnAll;
  if (activeBtn) {
    activeBtn.className = 'px-3 py-1.5 rounded-md bg-white shadow-sm border border-[#ddd9d3] text-[#14422f] font-bold cursor-pointer';
  }
}

export function initExportCSV(): void {
  const btnWeek = document.getElementById('filter-week');
  const btnMonth = document.getElementById('filter-month');
  const btnAll = document.getElementById('filter-all');

  btnWeek?.addEventListener('click', () => setReportTimeframe('week'));
  btnMonth?.addEventListener('click', () => setReportTimeframe('month'));
  btnAll?.addEventListener('click', () => setReportTimeframe('all'));

  (window as any).exportCSV = async function (): Promise<void> {
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
        const cv = cand.latestCv || (cand.cvs && cand.cvs[0]);
        const date = cv?.createdAt ? new Date(cv.createdAt) : new Date(cand.createdAt);
        return date >= cutoffDate;
      });

      const filterTitle = getTimeframeLabel();
      const currentDateStr = new Date().toLocaleString('tr-TR');

      // Excel HTML Table biçimlendirmesi (Excel hücre boyutları ve başlık stili ile)
      let excelHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Beacon Analiz Raporu</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
          <style>
            body { font-family: Calibri, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th { background-color: #14422f; color: #ffffff; font-weight: bold; border: 1px solid #14422f; padding: 8px; text-align: left; }
            td { border: 1px solid #ddd9d3; padding: 6px; text-align: left; }
            .title-header { font-size: 16px; font-weight: bold; color: #14422f; }
            .meta-text { font-size: 11px; color: #555555; }
          </style>
        </head>
        <body>
          <table>
            <tr><td colspan="5" class="title-header">BEACON HR ANALİTİK VE PERFORMANS RAPORU</td></tr>
            <tr><td colspan="5" class="meta-text">Zaman Filtresi: <b>${filterTitle}</b> | Rapor Tarihi: ${currentDateStr}</td></tr>
            <tr><td colspan="5"></td></tr>
            <thead>
              <tr>
                <th>Aday Adı / E-posta</th>
                <th>CV Dosya Adı</th>
                <th>Yükleme Tarihi</th>
                <th>Analiz Durumu</th>
                <th>ATS Uyum Skoru</th>
              </tr>
            </thead>
            <tbody>
      `;

      filteredCandidates.forEach((cand: any) => {
        const candName = cand.name || cand.email || 'Bilinmeyen Aday';
        const cvName = cand.latestCvName || 'CV Yüklenmedi';
        const dateStr = cand.createdAt ? new Date(cand.createdAt).toLocaleDateString('tr-TR') : '-';
        const status = cand.analysisStatus === 'COMPLETED' ? 'Analiz Hazır' : cand.analysisStatus === 'PROCESSING' ? 'İşleniyor' : cand.analysisStatus === 'PENDING' ? 'Sırada' : 'CV Yok';
        const scoreStr = cand.atsScore !== undefined && cand.atsScore !== null ? `%${cand.atsScore}` : '-';

        excelHtml += `
          <tr>
            <td><b>${candName}</b></td>
            <td>${cvName}</td>
            <td>${dateStr}</td>
            <td>${status}</td>
            <td><b>${scoreStr}</b></td>
          </tr>
        `;
      });

      excelHtml += `
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileSlug = activeTimeframe === 'week' ? 'bu_hafta' : activeTimeframe === 'month' ? 'bu_ay' : 'tum_zamanlar';
      link.download = `beacon_analiz_raporu_${fileSlug}_${new Date().toISOString().slice(0, 10)}.xls`;
      link.click();
      URL.revokeObjectURL(url);

    } catch (err: any) {
      console.error("Excel Export error:", err);
      alert("Excel raporu dışa aktarılırken bir hata oluştu.");
    }
  };
}
