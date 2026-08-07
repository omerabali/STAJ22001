/**
 * candidateComparison.ts (Arama Seçim & Karşılaştırma Kutusu Yöneticisi)
 * Görevi: Akıllı Arama sonuç listesinden 2 aday seçildiğinde ekranın altında çıkan
 * "Adayları Karşılaştır" barını yönetir. Tıklanınca aday ID'leri ile `/admin/compare` sayfasına yönlendirir.
 */
export interface CompareCandidate {
  id: string;
  name: string;
}

let selectedCompareCandidates: CompareCandidate[] = [];

export function toggleCompareCandidate(candId: string, candName: string, event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const existingIdx = selectedCompareCandidates.findIndex(c => c.id === candId);

  if (existingIdx >= 0) {
    selectedCompareCandidates.splice(existingIdx, 1);
  } else {
    if (selectedCompareCandidates.length >= 2) {
      alert("En fazla 2 aday karşılaştırılabilir. Lütfen önce seçili bir adayı çıkarın.");
      return;
    }
    selectedCompareCandidates.push({ id: candId, name: candName });
  }

  updateCompareFloatingBar();
  updateCompareButtonsUI();
}

export function clearSelectedCompareCandidates(): void {
  selectedCompareCandidates = [];
  updateCompareFloatingBar();
  updateCompareButtonsUI();
}

export function updateCompareFloatingBar(): void {
  const bar = document.getElementById('compare-floating-bar');
  const text = document.getElementById('compare-bar-text');
  const btn = document.getElementById('start-compare-btn') as HTMLButtonElement | null;
  const clearBtn = document.getElementById('clear-compare-btn');
  if (!bar || !text) return;

  if (clearBtn) {
    clearBtn.onclick = (e) => {
      e.preventDefault();
      clearSelectedCompareCandidates();
    };
  }

  const count = selectedCompareCandidates.length;

  if (count === 0) {
    bar.classList.add('hidden');
    bar.classList.remove('flex', 'translate-y-0');
    bar.classList.add('translate-y-12');
  } else {
    bar.classList.remove('hidden', 'translate-y-12');
    bar.classList.add('flex', 'translate-y-0');

    if (count === 1) {
      text.textContent = `1/2 Aday Seçildi: ${selectedCompareCandidates[0].name || 'Aday 1'}`;
      if (btn) {
        btn.disabled = true;
        btn.onclick = null;
      }
    } else if (count === 2) {
      text.textContent = `2/2 Aday Seçildi: ${selectedCompareCandidates[0].name} vs ${selectedCompareCandidates[1].name}`;
      if (btn) {
        btn.disabled = false;
        btn.onclick = (e) => {
          e.preventDefault();
          const url = `/admin/compare?candidate1=${selectedCompareCandidates[0].id}&candidate2=${selectedCompareCandidates[1].id}`;
          window.location.href = url;
        };
      }
    }
  }
}

export function updateCompareButtonsUI(): void {
  document.querySelectorAll('[data-compare-id]').forEach(btn => {
    const element = btn as HTMLElement;
    const id = element.dataset.compareId;
    const isSelected = selectedCompareCandidates.some(c => c.id === id);
    if (isSelected) {
      element.classList.add('bg-[#14422f]', 'text-white', 'border-[#14422f]');
      element.classList.remove('bg-white', 'text-[#1b1c1a]', 'border-[#ddd9d3]');
      element.innerHTML = `<span class="material-symbols-outlined text-xs">check</span> Seçildi`;
    } else {
      element.classList.remove('bg-[#14422f]', 'text-white', 'border-[#14422f]');
      element.classList.add('bg-white', 'text-[#1b1c1a]', 'border-[#ddd9d3]');
      element.innerHTML = `<span class="material-symbols-outlined text-xs">compare_arrows</span> Karşılaştır`;
    }
  });
}

// Window Global Binding
(window as any).toggleCompareCandidate = toggleCompareCandidate;
(window as any).clearSelectedCompareCandidates = clearSelectedCompareCandidates;
