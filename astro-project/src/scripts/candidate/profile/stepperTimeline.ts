/**
 * stepperTimeline.ts (Profil İlerleme Adımı & Zaman Çizgisi Yöneticisi)
 * Görevi: Profil sayfasında 4 adımlı yükleme barını ve canlı aktivite çizelgesini (timeline)
 * anlık olarak ekranda günceller ve renklerini ayarlar.
 */
export function updateStepUI(currentStep: number, message: string): void {
  const total = 4;
  const pct = Math.min(Math.round((currentStep / total) * 100), 100);

  for (let i = 1; i <= total; i++) {
    const dot = document.getElementById(`step-dot-${i}`);
    const label = document.getElementById(`step-label-${i}`);
    const icon = document.getElementById(`step-icon-${i}`);
    if (!dot) continue;
    if (i <= currentStep) {
      dot.style.borderColor = '#14422f';
      dot.style.background = '#14422f';
      if (icon) icon.style.color = 'white';
      if (label) label.style.color = '#14422f';
    } else {
      dot.style.borderColor = '#ddd9d3';
      dot.style.background = 'white';
      if (icon) icon.style.color = '#ddd9d3';
      if (label) label.style.color = '#ddd9d3';
    }
  }

  const uploadBar = document.getElementById('upload-progress-bar');
  const uploadStatus = document.getElementById('upload-status-text');
  const uploadBadge = document.getElementById('upload-percent');
  if (uploadBar) uploadBar.style.width = `${pct}%`;
  if (uploadStatus && message) uploadStatus.textContent = message;
  if (uploadBadge) uploadBadge.textContent = `${pct}%`;

  const timeline = document.getElementById('live-activity-timeline');
  if (timeline) {
    const stepIcons: Record<number, string> = { 1: 'upload', 2: 'cut', 3: 'smart_toy', 4: 'check_circle' };
    const stepLabels: Record<number, string> = { 1: 'Yüklendi', 2: 'İşleniyor', 3: 'AI Analiz', 4: 'Hazır' };
    const existingSteps = timeline.querySelectorAll('.timeline-step');
    const alreadyRendered = new Set<number>();
    existingSteps.forEach(el => alreadyRendered.add(parseInt((el as HTMLElement).dataset.step || '0', 10)));

    for (let s = 1; s <= currentStep; s++) {
      if (alreadyRendered.has(s)) {
        const existing = timeline.querySelector(`.timeline-step[data-step="${s}"]`);
        if (existing) {
          const dot = existing.querySelector('.tl-dot') as HTMLElement;
          const spinner = existing.querySelector('.tl-spinner');
          if (dot) {
            dot.style.borderColor = '#14422f';
            dot.style.background = '#14422f';
            const iconSpan = dot.querySelector('span');
            if (iconSpan) iconSpan.style.color = 'white';
          }
          if (spinner) spinner.classList.add('hidden');
        }
        continue;
      }
      const isActive = (s === currentStep && currentStep < 4);
      const row = document.createElement('div');
      row.className = 'timeline-step flex items-start gap-3 animate-fadeIn';
      row.dataset.step = String(s);
      const now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      row.innerHTML = `
        <div class="flex flex-col items-center shrink-0">
          <div class="tl-dot w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300" style="border-color:${isActive ? '#14422f' : '#14422f'};background:${isActive ? 'white' : '#14422f'}">
            <span class="material-symbols-outlined text-[16px]" style="color:${isActive ? '#14422f' : 'white'}">${stepIcons[s] || 'circle'}</span>
          </div>
          ${s < 4 ? '<div class="w-0.5 h-6 bg-[#ddd9d3] mt-1"></div>' : ''}
        </div>
        <div class="flex-1 pt-1 pb-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-bold text-[#1b1c1a]">${stepLabels[s] || 'Adım ' + s}</p>
            <span class="text-[10px] text-[#8a8580] font-mono">${now}</span>
          </div>
          <p class="text-[11px] text-[#8a8580] mt-0.5">${message || ''}</p>
        </div>
      `;
      timeline.appendChild(row);
    }
  }

  const stepBadge = document.getElementById('profile-step-badge');
  if (stepBadge) stepBadge.textContent = `Adım ${currentStep} / 4`;
}
