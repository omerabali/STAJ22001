/**
 * cvDropdown.ts (Aday Çoklu CV Açılır Menü Yöneticisi)
 * Görevi: Bir adayın birden fazla yüklenmiş CV'si varsa, Admin'in üst kısımdaki açılır menüden
 * (dropdown) dilediği CV'yi seçerek o CV'nin analiz raporuna geçmesini sağlar.
 */
import { candProfileState } from './candProfileState';
export function renderCvDropdown(preferredCvId: string | null): void {
  const container = document.getElementById('cv-selector-container');
  const dropdown = document.getElementById('cv-selector-dropdown') as HTMLSelectElement | null;
  if (!container || !dropdown || candProfileState.candidateCvs.length === 0) return;

  container.classList.remove('hidden');

  const targetId = (preferredCvId && candProfileState.candidateCvs.some((c: any) => c.id === preferredCvId))
    ? preferredCvId
    : candProfileState.candidateCvs[0].id;

  candProfileState.activeCvId = targetId;

  dropdown.innerHTML = candProfileState.candidateCvs.map((cv: any, idx: number) => {
    const dateStr = cv.createdAt ? new Date(cv.createdAt).toLocaleDateString('tr-TR') : '';
    const title = cv.fileName ? `${cv.fileName} (${dateStr})` : `CV #${idx + 1} (${dateStr})`;
    return `<option value="${cv.id}" ${cv.id === targetId ? 'selected' : ''}>${title}</option>`;
  }).join('');
}

export function handleCvSelectionChange(newCvId: string): void {
  if (!newCvId || newCvId === candProfileState.activeCvId) return;
  candProfileState.activeCvId = newCvId;

  // Update URL search query without reloading page
  const url = new URL(window.location.href);
  url.searchParams.set('cvId', newCvId);
  window.history.replaceState({}, '', url.toString());

  // Import renderSelectedCvDetails lazily to avoid circular deps
  import('./cvDetailsRenderer').then(m => m.renderSelectedCvDetails(newCvId));
}

(window as any).handleCvSelectionChange = handleCvSelectionChange;
