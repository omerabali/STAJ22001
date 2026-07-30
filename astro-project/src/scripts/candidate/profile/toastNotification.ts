/**
 * 2. Toast Notification
 * Sayfanın sağ altında çıkan bildirim baloncukları (showProfileToast).
 */
export function showProfileToast(title: string, desc: string): void {
  let toast = document.getElementById('profile-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'profile-toast';
    toast.className = 'fixed bottom-6 right-6 z-50 transition-all duration-500 transform translate-y-10 opacity-0';
    toast.innerHTML = `
      <div class="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#14422f] text-white shadow-xl border border-[#14422f]/60 max-w-xs">
        <span class="material-symbols-outlined text-emerald-400 shrink-0">check_circle</span>
        <div>
          <p class="text-xs font-bold" id="profile-toast-title">${title}</p>
          <p class="text-[11px] text-emerald-200" id="profile-toast-desc">${desc}</p>
        </div>
      </div>
    `;
    document.body.appendChild(toast);
  } else {
    const t = document.getElementById('profile-toast-title');
    const d = document.getElementById('profile-toast-desc');
    if (t) t.textContent = title;
    if (d) d.textContent = desc;
  }

  setTimeout(() => {
    toast?.classList.remove('translate-y-10', 'opacity-0');
    toast?.classList.add('translate-y-0', 'opacity-100');
  }, 50);

  setTimeout(() => {
    toast?.classList.add('translate-y-10', 'opacity-0');
    toast?.classList.remove('translate-y-0', 'opacity-100');
  }, 4500);
}
