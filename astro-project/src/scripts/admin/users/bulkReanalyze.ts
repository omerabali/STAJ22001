import { usersState } from './usersState';

/**
 * Toplu seçim & yeniden analiz UI kontrolü.
 */
export function updateBulkReanalyzeButtonUI(): void {
  const btn = document.getElementById('bulk-reanalyze-btn');
  const text = document.getElementById('bulk-reanalyze-text');
  if (!btn || !text) return;

  const count = usersState.selectedUserIds.size;
  if (count > 0) {
    btn.classList.remove('hidden');
    btn.classList.add('flex');
    text.textContent = `Seçilenleri Yeniden Analiz Et (${count})`;
  } else {
    btn.classList.add('hidden');
    btn.classList.remove('flex');
  }
}

export function initToggleSelectAllUsers(): void {
  (window as any).toggleSelectAllUsers = function (masterCheckbox: HTMLInputElement): void {
    const isChecked = masterCheckbox.checked;
    document.querySelectorAll('.user-checkbox').forEach((cb: any) => {
      cb.checked = isChecked;
      if (cb.value) {
        if (isChecked) usersState.selectedUserIds.add(cb.value);
        else usersState.selectedUserIds.delete(cb.value);
      }
    });
    updateBulkReanalyzeButtonUI();
  };

  (window as any).toggleSelectAllFilteredCandidates = function (masterCheckbox: HTMLInputElement): void {
    const isChecked = masterCheckbox.checked;
    document.querySelectorAll('.candidate-filter-checkbox').forEach((cb: any) => {
      cb.checked = isChecked;
      if (cb.value) {
        if (isChecked) usersState.selectedUserIds.add(cb.value);
        else usersState.selectedUserIds.delete(cb.value);
      }
    });
    updateBulkReanalyzeButtonUI();
  };

  (window as any).toggleSelectUser = function (userId: string, isChecked: boolean): void {
    if (!userId) return;
    if (isChecked) usersState.selectedUserIds.add(userId);
    else usersState.selectedUserIds.delete(userId);
    updateBulkReanalyzeButtonUI();
  };
}

export async function executeBulkReanalyze(fetchUsersFn: () => void): Promise<void> {
  const selectedIds = Array.from(usersState.selectedUserIds);
  if (selectedIds.length === 0) return;
  if (!confirm(`${selectedIds.length} adet kullanıcının CV'sini yeniden analiz etmek istediğinize emin misiniz?`)) return;

  const btn = document.getElementById('bulk-reanalyze-btn') as HTMLButtonElement | null;
  const spinner = document.getElementById('bulk-reanalyze-spinner');
  const icon = document.getElementById('bulk-reanalyze-icon');
  const text = document.getElementById('bulk-reanalyze-text');

  try {
    if (btn) btn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    if (icon) icon.classList.add('hidden');
    if (text) text.textContent = `Analiz Ediliyor (${selectedIds.length})...`;

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/candidates/reanalyze', {
      method: 'POST', headers, credentials: 'include',
      body: JSON.stringify({ userIds: selectedIds })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`✅ İşlem Tamamlandı!\n${data.message}`);
      usersState.selectedUserIds.clear();
      updateBulkReanalyzeButtonUI();
      fetchUsersFn();
    } else {
      alert(`❌ Hata: ${data.message || 'Toplu analiz başarısız.'}`);
    }
  } catch (err: any) {
    alert(`❌ Bağlantı Hatası: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (icon) icon.classList.remove('hidden');
  }
}
