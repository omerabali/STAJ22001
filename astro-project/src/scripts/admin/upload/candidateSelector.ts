/**
 * candidateSelector.ts (Admin Aday Seçici Menü Yöneticisi)
 * Görevi: Admin CV yüklerken hangi aday adına dosya yükleyeceğini seçmesi için aday listesini çeker.
 * Seçilen adayın avatar ve e-posta bilgilerini karta yansıtır.
 */
let allCandidates: any[] = [];

export async function loadCandidates(): Promise<void> {
  const select = document.getElementById('admin-candidate-select') as HTMLSelectElement;
  if (!select) return;
  try {
    const res = await fetch('/api/admin/candidates');
    if (!res.ok) throw new Error();
    const data = await res.json();
    allCandidates = data.candidates || [];
    allCandidates.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name ? `${c.name} — ${c.email}` : c.email;
      select.appendChild(opt);
    });
  } catch {}
}

export function updateSelectedCard(): void {
  const select = document.getElementById('admin-candidate-select') as HTMLSelectElement;
  const avatar = document.getElementById('selected-user-avatar');
  const nameEl = document.getElementById('selected-user-name');
  const emailEl = document.getElementById('selected-user-email');
  if (!select) return;
  const val = select.value;
  if (!val) {
    if (avatar) avatar.innerHTML = '<span class="material-symbols-outlined text-white text-[15px]">admin_panel_settings</span>';
    if (nameEl) nameEl.textContent = 'Admin (Ben)';
    if (emailEl) emailEl.textContent = 'Kendi hesabıma yükleniyor';
    return;
  }
  const cand = allCandidates.find(c => c.id === val);
  if (cand) {
    if (avatar) {
      if (cand.avatarUrl) {
        avatar.innerHTML = `<img src="${cand.avatarUrl}" class="w-full h-full object-cover rounded-full" />`;
      } else {
        const init = (cand.name || cand.email).substring(0, 2).toUpperCase();
        avatar.innerHTML = `<span class="text-xs font-bold text-white">${init}</span>`;
      }
    }
    if (nameEl) nameEl.textContent = cand.name || 'İsimsiz Aday';
    if (emailEl) emailEl.textContent = cand.email;
  }
}

export function getAllCandidates() {
  return allCandidates;
}
