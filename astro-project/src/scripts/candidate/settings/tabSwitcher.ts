/**
 * tabSwitcher.ts (Ayarlar Sekme Geçiş Yöneticisi)
 * Görevi: Ayarlar sayfasındaki "Profil", "Güvenlik" ve "Bildirimler" sekmeleri (.tab-btn)
 * arasında tıklanınca canlı içerik geçişi sağlar, aktif sekmeyi renklendirir.
 */
export function initTabSwitcher(): void {
  const tabs = document.querySelectorAll('.tab-btn');
  const sections = document.querySelectorAll('.settings-section');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');

      tabs.forEach((t) => {
        t.classList.remove('bg-white', 'bg-[#14422f]', 'text-[#14422f]', 'text-white', 'border-[#14422f]', 'shadow-sm');
        t.classList.add('text-[#8a8580]', 'border-transparent');
      });

      tab.classList.remove('text-[#8a8580]', 'border-transparent');
      tab.classList.add('bg-[#14422f]', 'text-white', 'border-[#14422f]', 'shadow-sm');

      sections.forEach((section) => section.classList.add('hidden'));

      if (targetId) {
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.remove('hidden');
      }
    });
  });
}
