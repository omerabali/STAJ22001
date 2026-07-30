/**
 * 2. Tab Switcher
 * Tekli / Toplu yükleme sekmeleri arasında geçiş yapma (switchTab).
 */
export function switchTab(tabName: string): void {
  const tabs = document.querySelectorAll('.upload-tab');
  tabs.forEach((t) => {
    const element = t as HTMLElement;
    const isActive = element.dataset.tab === tabName;
    element.classList.toggle('border-[#14422f]', isActive);
    element.classList.toggle('text-[#14422f]', isActive);
    element.classList.toggle('bg-[#14422f]/[0.03]', isActive);
    element.classList.toggle('border-transparent', !isActive);
    element.classList.toggle('text-[#8a8580]', !isActive);
    element.classList.toggle('hover:text-[#1b1c1a]', !isActive);
    element.classList.toggle('hover:bg-[#f5f4f0]', !isActive);
  });
  document.getElementById('panel-single')?.classList.toggle('hidden', tabName !== 'single');
  document.getElementById('panel-bulk')?.classList.toggle('hidden', tabName !== 'bulk');
}
