import { candProfileState } from './candProfileState';

/**
 * CV dropdown — multi-CV seçici render eder.
 */
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
  // Import renderSelectedCvDetails lazily to avoid circular deps
  import('./cvDetailsRenderer').then(m => m.renderSelectedCvDetails(newCvId));
}

(window as any).handleCvSelectionChange = handleCvSelectionChange;
