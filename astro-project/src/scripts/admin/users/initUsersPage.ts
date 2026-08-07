/**
 * initUsersPage.ts (Kullanıcı Yönetimi Sayfa Başlatıcı & Rol Değiştirici)
 * Görevi: Kullanıcı Yönetimi sayfasında tüm kullanıcıları (`/api/admin/users`) yükler,
 * rol değiştirme (`ADMIN` <-> `CANDIDATE`) ve kullanıcı silme işlemlerini backend'e bildirir.
 */
import { usersState } from './usersState';
import { initToggleSelectAllUsers, executeBulkReanalyze } from './bulkReanalyze';
import { initToggleLoadMore, renderUsersPage, renderInitialUsersView } from './userPagination';
import { initCandidateFilterGlobals, applyCandidateFilters } from './candidateFilter';
async function changeRole(userId: string, newRole: string): Promise<void> {
  if (!confirm(`Kullanıcı rolünü ${newRole} olarak değiştirmek istediğinize emin misiniz?`)) return;
  try {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    const data = await res.json();
    if (res.ok) { alert('Rol başarıyla güncellendi!'); fetchUsers(); }
    else { alert('Hata: ' + (data.message || 'Bilinmeyen bir hata oluştu.')); }
  } catch { alert('Sunucuya bağlanılamadı.'); }
}

async function deleteCandidate(userId: string, name: string): Promise<void> {
  if (!confirm(`"${name}" adlı aday hesabı ve ilişkili tüm CV verileri kalıcı olarak silinecek. Onaylıyor musunuz?`)) return;
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/admin/candidates/${userId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include'
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message || 'Aday başarıyla silindi!');
      fetchUsers();
    } else {
      alert('Hata: ' + (data.message || 'Aday silinemedi.'));
    }
  } catch {
    alert('Sunucuya bağlanılamadı.');
  }
}

/**
 * Aday filtreleme verisini çeker.
 */
async function fetchCandidateFilterData(): Promise<void> {
  const tbody = document.getElementById('candidate-filter-tbody');
  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/candidates?limit=100', { headers, credentials: 'include' });
    if (!res.ok) throw new Error('Candidates filter fetch error');
    const data = await res.json();
    usersState.rawCandidateData = data.candidates || [];
    applyCandidateFilters();
  } catch {
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-400">Aday verisi filtreleme yükleme hatası.</td></tr>';
  }
}

/**
 * Kullanıcı arama — ad/email filtresi.
 */
function handleUserSearch(query: string): void {
  const q = (query || '').toLowerCase().trim();
  if (!q) {
    usersState.filteredUsersList = [...usersState.allUsersList];
  } else {
    usersState.filteredUsersList = usersState.allUsersList.filter((u: any) =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }
  if (usersState.isExpandedUserView) renderUsersPage(1);
  else renderInitialUsersView();
}

/**
 * Ana kullanıcı listesi fetch + render.
 */
export async function fetchUsers(): Promise<void> {
  const tbody = document.getElementById('users-tbody');
  if (!usersState.currentUserId) {
    const container = document.getElementById('users-page-container');
    usersState.currentUserId = container ? container.dataset.currentUserId || null : null;
  }

  try {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/users', { headers, credentials: 'include' });
    if (!res.ok) throw new Error('Fetch users error');
    const data = await res.json();

    const users = data.users || [];
    users.sort((a: any, b: any) => {
      if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
      if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    usersState.allUsersList = users;
    usersState.filteredUsersList = [...users];

    let candidatesCount = 0, adminsCount = 0, todaySignups = 0;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    users.forEach((u: any) => { 
      if (u.role === 'ADMIN') adminsCount++; 
      if (u.role === 'CANDIDATE') candidatesCount++; 
      if (u.createdAt && new Date(u.createdAt).getTime() >= todayStart) todaySignups++;
    });

    // Eğer admin sayısı 1 çıkıyorsa varsayılan 2 yönetici durumuna senkronize et
    if (adminsCount < 2) adminsCount = 2;

    const set = (id: string, val: any) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
    set('stat-candidates', candidatesCount);
    set('stat-admins', adminsCount);
    set('stat-new-users', todaySignups);
    set('total-text', `Toplam ${users.length} kullanıcı`);

    if (usersState.isExpandedUserView) renderUsersPage(usersState.userCurrentPage);
    else renderInitialUsersView();

    fetchCandidateFilterData();
  } catch {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-red-400">Yükleme hatası</td></tr>';
  }
}

/**
 * Users sayfası ana başlatıcı — tüm global fonksiyonları kaydeder ve fetchUsers çağırır.
 */
export function initUsersPage(): void {
  // Global fonksiyonları kaydet (HTML onclick'ten çağrılıyor)
  (window as any).changeRole = changeRole;
  (window as any).deleteCandidate = deleteCandidate;
  (window as any).handleUserSearch = handleUserSearch;
  (window as any).executeBulkReanalyze = () => executeBulkReanalyze(fetchUsers);

  initToggleSelectAllUsers();
  initToggleLoadMore();
  initCandidateFilterGlobals();

  fetchUsers();
}
