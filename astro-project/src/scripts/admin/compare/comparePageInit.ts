/**
 * comparePageInit.ts (Aday Karşılaştırma Sayfa Başlatıcısı)
 * Görevi: URL parametrelerinden (?c1=id&c2=id) iki adayın bilgilerini çeker,
 * iki sütun halinde yan yana getirerek yapay zeka analiz ve skor karşılaştırmalarını başlatır.
 */
import { renderCandidateColumn } from './candidateColumnRenderer';

let candidate1Data: any = null;
let candidate2Data: any = null;
let selectedCv1Id: string | undefined = undefined;
let selectedCv2Id: string | undefined = undefined;

export function clearCompareCache(): void {
  sessionStorage.removeItem('last_compare_c1');
  sessionStorage.removeItem('last_compare_c2');
  sessionStorage.removeItem('last_compare_cv1');
  sessionStorage.removeItem('last_compare_cv2');
}

/**
 * Karşılaştırma sayfası ana başlatıcı.
 * Dropdown'ları doldurur, URL veya SessionStorage'dan aday verisi çeker, iki sütunu ve seçili CV'leri render eder.
 */
export async function loadComparisonData(): Promise<void> {
  const grid = document.getElementById('compare-grid');
  const loading = document.getElementById('compare-loading');
  const promptDiv = document.getElementById('compare-prompt');
  const errorDiv = document.getElementById('compare-error');
  const select1 = document.getElementById('select-cand-1') as HTMLSelectElement | null;
  const select2 = document.getElementById('select-cand-2') as HTMLSelectElement | null;
  const runBtn = document.getElementById('run-compare-btn');

  if (!grid || !loading || !errorDiv || !promptDiv) return;

  // Global CV değiştirme işleyicisi
  (window as any).changeCompareCv = (containerId: string, candId: string, selectedCvId: string) => {
    if (containerId === 'cand1-card' && candidate1Data) {
      selectedCv1Id = selectedCvId;
      sessionStorage.setItem('last_compare_cv1', selectedCvId);
      renderCandidateColumn('cand1-card', candidate1Data, selectedCvId);
    } else if (containerId === 'cand2-card' && candidate2Data) {
      selectedCv2Id = selectedCvId;
      sessionStorage.setItem('last_compare_cv2', selectedCvId);
      renderCandidateColumn('cand2-card', candidate2Data, selectedCvId);
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  let c1Id = urlParams.get('candidate1') || grid.dataset.c1 || sessionStorage.getItem('last_compare_c1') || '';
  let c2Id = urlParams.get('candidate2') || grid.dataset.c2 || sessionStorage.getItem('last_compare_c2') || '';

  // Dropdown'ları doldur
  try {
    const cRes = await fetch('/api/admin/candidates');
    if (cRes.ok) {
      const cData = await cRes.json();
      const candidates = cData.candidates || [];
      if (select1 && select2) {
        select1.innerHTML = '<option value="">1. Adayı Seçin...</option>';
        select2.innerHTML = '<option value="">2. Adayı Seçin...</option>';
        candidates.forEach((c: any) => {
          const label = c.name ? `${c.name} (${c.email})` : c.email;
          select1.innerHTML += `<option value="${c.id}" ${c.id === c1Id ? 'selected' : ''}>${label}</option>`;
          select2.innerHTML += `<option value="${c.id}" ${c.id === c2Id ? 'selected' : ''}>${label}</option>`;
        });
      }
    }
  } catch (err) {
    console.error('Failed to load candidates list for dropdowns:', err);
  }

  // Karşılaştırma tetikleme
  const executeCompare = () => {
    const val1 = select1?.value || '';
    const val2 = select2?.value || '';
    if (!val1 || !val2) return;
    if (val1 === val2) { alert('Lütfen 2 farklı aday seçin.'); return; }
    
    sessionStorage.setItem('last_compare_c1', val1);
    sessionStorage.setItem('last_compare_c2', val2);

    window.location.href = `/admin/compare?candidate1=${val1}&candidate2=${val2}`;
  };

  if (runBtn) runBtn.onclick = () => {
    if (!select1?.value || !select2?.value) { alert('Lütfen karşılaştırmak için 2 aday seçin.'); return; }
    executeCompare();
  };
  if (select1) select1.onchange = executeCompare;
  if (select2) select2.onchange = executeCompare;

  // Aday seçilmediyse prompt göster
  if (!c1Id || !c2Id) {
    loading.classList.add('hidden');
    grid.classList.add('hidden');
    errorDiv.classList.add('hidden');
    promptDiv.classList.remove('hidden');
    promptDiv.classList.add('flex', 'flex-col');
    return;
  }

  // Aynı aday seçildiyse hata göster
  if (c1Id === c2Id) {
    loading.classList.add('hidden');
    grid.classList.add('hidden');
    promptDiv.classList.add('hidden');
    errorDiv.classList.remove('hidden');
    errorDiv.classList.add('flex');
    const errTitle = document.getElementById('compare-error-title');
    const errDesc = document.getElementById('compare-error-desc');
    if (errTitle) errTitle.textContent = 'Aynı Aday Seçildi';
    if (errDesc) errDesc.textContent = 'Karşılaştırma yapabilmek için lütfen 2 farklı aday seçin.';
    return;
  }

  // Önbelleğe kaydet
  sessionStorage.setItem('last_compare_c1', c1Id);
  sessionStorage.setItem('last_compare_c2', c2Id);

  selectedCv1Id = sessionStorage.getItem('last_compare_cv1') || undefined;
  selectedCv2Id = sessionStorage.getItem('last_compare_cv2') || undefined;

  promptDiv.classList.add('hidden');
  errorDiv.classList.add('hidden');
  loading.classList.remove('hidden');
  loading.classList.add('flex');

  try {
    const [res1, res2] = await Promise.all([
      fetch(`/api/admin/candidates/${c1Id}`),
      fetch(`/api/admin/candidates/${c2Id}`)
    ]);
    if (!res1.ok || !res2.ok) throw new Error('Aday verileri sunucudan okunamadı.');

    const data1 = await res1.json();
    const data2 = await res2.json();

    candidate1Data = data1.candidate;
    candidate2Data = data2.candidate;

    loading.classList.add('hidden');
    loading.classList.remove('flex');
    grid.classList.remove('hidden');
    grid.classList.add('grid');

    renderCandidateColumn('cand1-card', candidate1Data, selectedCv1Id);
    renderCandidateColumn('cand2-card', candidate2Data, selectedCv2Id);

  } catch (err: any) {
    console.error('Compare load error:', err);
    loading.classList.add('hidden');
    grid.classList.add('hidden');
    errorDiv.classList.remove('hidden');
    errorDiv.classList.add('flex');
  }
}
