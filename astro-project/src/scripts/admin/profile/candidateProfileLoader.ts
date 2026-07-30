import { adminProfileState } from './adminProfileState';
import { updateSwotAnalysisCard } from './swotAnalysisCard';
import { showCvContent } from './cvContentViewer';

/**
 * Ana aday profil yükleyici — userId ile API'den çeker, CV tablosunu + analiz kartını render eder.
 */
export function loadCandidateProfile(): void {
  const container = document.getElementById('profile-page-container');
  const userId = container ? container.getAttribute('data-user-id') : null;

  if (!userId) {
    const nameEl = document.getElementById('candidate-name-header');
    const emailEl = document.getElementById('candidate-email-header');
    if (nameEl) nameEl.textContent = 'Hata: Aday ID eksik';
    if (emailEl) emailEl.textContent = 'URL parametresi bulunamadı.';
    return;
  }

  let decodedUserId: string;
  try { decodedUserId = decodeURIComponent(userId).trim(); } catch { decodedUserId = userId.trim(); }
  if (/^[0-9a-fA-F]{8}\s[0-9a-fA-F]{4}\s[0-9a-fA-F]{4}\s[0-9a-fA-F]{4}\s[0-9a-fA-F]{12}$/.test(decodedUserId)) {
    decodedUserId = decodedUserId.replace(/\s+/g, '-');
  }

  if ((window as any).__swrCache) (window as any).__swrCache.invalidate(`candidate-profile-${decodedUserId}`);

  const tableBody = document.getElementById('cvs-table-body');
  if (!tableBody) return;

  const fetcher = async () => {
    const res = await fetch(`/api/admin/candidates/${decodedUserId}`);
    if (!res.ok) throw new Error(`API hatası: ${res.status}`);
    return res.json();
  };

  const render = (data: any) => {
    adminProfileState.candidateData = data.candidate;
    const cd = adminProfileState.candidateData;

    const set = (id: string, val: string) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('candidate-name-header', cd.name || 'İsimsiz Aday');
    set('candidate-email-header', cd.email);
    set('profile-name', cd.name || '-');
    set('profile-email', cd.email || '-');
    set('profile-phone', cd.phone || '-');
    set('profile-date', new Date(cd.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }));

    const initials = (cd.name || cd.email || '??').substring(0, 2).toUpperCase();
    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl) {
      if (cd.avatarUrl) { avatarEl.style.backgroundImage = `url(${cd.avatarUrl})`; avatarEl.textContent = ''; }
      else { avatarEl.style.backgroundImage = ''; avatarEl.textContent = initials; }
    }

    const cvs = cd.cvs || [];
    const countBadge = document.getElementById('cv-count-badge');
    if (countBadge) countBadge.textContent = `${cvs.length} Belge`;

    if (cvs.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-[#8a8580] font-medium">Bu adaya ait yüklenmiş özgeçmiş bulunmamaktadır.</td></tr>';
      return;
    }

    tableBody.innerHTML = '';
    cvs.forEach((cv: any, idx: number) => {
      const latestAnalysis = cv.analyses && cv.analyses[0];
      const status = latestAnalysis ? latestAnalysis.status : 'PENDING';
      const dateStr = new Date(cv.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

      let statusBadge = '';
      if (status === 'PENDING') statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span> Sırada</span>';
      else if (status === 'PROCESSING') statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-spin"></span> İşleniyor</span>';
      else if (status === 'COMPLETED') statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Hazır</span>';
      else statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Hata</span>';

      const scoreStr = latestAnalysis && latestAnalysis.atsScore !== null
        ? `<span class="font-bold text-emerald-700">%${latestAnalysis.atsScore} ATS Skoru</span>`
        : '<span class="text-[#8a8580]">-</span>';

      const isSelected = adminProfileState.selectedCvId === cv.id || (!adminProfileState.selectedCvId && idx === 0);
      if (isSelected) adminProfileState.selectedCvId = cv.id;

      const tr = document.createElement('tr');
      tr.className = `hover:bg-[#f5f4f0]/60 transition-all group cursor-pointer ${isSelected ? 'bg-[#f5f4f0] font-semibold' : ''}`;
      tr.onclick = () => {
        adminProfileState.selectedCvId = cv.id;
        tableBody.querySelectorAll('tr').forEach((r: Element) => r.classList.remove('bg-[#f5f4f0]', 'font-semibold'));
        tr.classList.add('bg-[#f5f4f0]', 'font-semibold');
        updateSwotAnalysisCard(cv);
        showCvContent(cv);
      };
      tr.innerHTML = `
        <td class="px-5 py-4"><div class="flex items-center gap-3"><span class="material-symbols-outlined text-red-600 text-[20px] shrink-0">picture_as_pdf</span><span class="font-bold text-[#1b1c1a] truncate max-w-[180px] text-xs">${cv.fileName}</span></div></td>
        <td class="px-5 py-4 text-[#8a8580] font-medium text-xs">${dateStr}</td>
        <td class="px-5 py-4">${statusBadge}</td>
        <td class="px-5 py-4 text-center text-xs font-bold">${scoreStr}</td>
        <td class="px-5 py-4 text-right" onclick="event.stopPropagation();"><a href="${cv.fileUrl}" target="_blank" class="inline-flex items-center justify-center text-[#8a8580] hover:text-[#14422f] p-1.5 rounded-lg hover:bg-[#14422f]/5 transition-colors" title="Dosyayı İndir / Görüntüle"><span class="material-symbols-outlined text-[18px]">download</span></a></td>`;
      tableBody.appendChild(tr);
    });

    const firstCv = cvs[0];
    if (firstCv) { updateSwotAnalysisCard(firstCv); showCvContent(firstCv); }
  };

  const handleError = (err: any) => {
    console.error('[Profile] Yükleme hatası:', err);
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-rose-600">Veriler yüklenemedi: ${err.message || 'Bilinmeyen hata'}</td></tr>`;
    const nameEl = document.getElementById('candidate-name-header');
    const emailEl = document.getElementById('candidate-email-header');
    if (nameEl) nameEl.textContent = 'Yükleme Hatası';
    if (emailEl) emailEl.textContent = err.message || 'Hata oluştu';
  };

  if ((window as any).__swrCache) {
    (window as any).__swrCache.query(`candidate-profile-${decodedUserId}`, fetcher, render, 30000, handleError);
  } else {
    fetcher().then(render).catch(handleError);
  }
}
