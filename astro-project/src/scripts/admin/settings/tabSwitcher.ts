/**
 * tabSwitcher.ts (Admin Ayarlar Sekme Yöneticisi)
 * Görevi: Admin Ayarlar sayfasındaki "Profil" ve "Güvenlik" sekmeleri arasında tıklanınca canlı görünüm geçişini sağlar.
 * .tab-btn tıklamalarını dinler, .settings-section görünürlüğünü kontrol eder.
 */
export function initTabSwitcher(): void {
  const tabs = document.querySelectorAll('.tab-btn');
  const sections = document.querySelectorAll('.settings-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');

      tabs.forEach(t => {
        t.classList.remove('bg-white', 'text-[#14422f]', 'border-[#14422f]', 'shadow-sm');
        t.classList.add('text-[#8a8580]', 'border-transparent');
      });

      tab.classList.remove('text-[#8a8580]', 'border-transparent');
      tab.classList.add('bg-white', 'text-[#14422f]', 'border-[#14422f]', 'shadow-sm');

      sections.forEach(section => section.classList.add('hidden'));

      const target = document.getElementById(targetId || '');
      if (target) target.classList.remove('hidden');
    });
  });
}
