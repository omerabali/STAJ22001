/**
 * userPagination.ts (Kullanıcı Sayfalama & Görünüm Yöneticisi)
 * Görevi: Kullanıcı listesinde "Daha Fazla Göster" ve sayfalama (pagination) adımlarını yönetir.
 * İlk başta özet 3 kullanıcı gösterip "Tümünü Gör" denilince tam listeye geçilmesini sağlar.
 */
import { usersState } from './usersState';
import { renderUserRows } from './userRowRenderer';
export function renderInitialUsersView(): void {
  const list = usersState.filteredUsersList;
  const admins = list.filter((u: any) => u.role === 'ADMIN');
  const candidates = list.filter((u: any) => u.role !== 'ADMIN');
  const displayed = [...admins.slice(0, 1), ...candidates.slice(0, 2)];
  renderUserRows(displayed);

  const loadMoreContainer = document.getElementById('load-more-container');
  if (loadMoreContainer) {
    if (list.length <= 3) loadMoreContainer.classList.add('hidden');
    else loadMoreContainer.classList.remove('hidden');
  }
}

/**
 * Sayfalanmış kullanıcı listesi görünümü.
 */
export function renderUsersPage(page = 1): void {
  usersState.userCurrentPage = page;
  const limit = 10;
  const total = usersState.filteredUsersList.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const displayed = usersState.filteredUsersList.slice(startIndex, startIndex + limit);

  renderUserRows(displayed);

  const infoEl = document.getElementById('user-pagination-info');
  if (infoEl) infoEl.textContent = `Gösterilen: ${startIndex + 1} - ${Math.min(startIndex + limit, total)} / Toplam ${total}`;

  const container = document.getElementById('user-pagination-controls');
  if (container) {
    let html = `<button ${page <= 1 ? 'disabled' : ''} onclick="renderUsersPage(${page - 1})" class="disabled:opacity-40 px-3 py-1.5 border border-[#ddd9d3] rounded-[6px] text-xs font-semibold bg-white hover:bg-[#faf9f5]">Önceki</button>`;
    for (let p = 1; p <= totalPages; p++) {
      if (p === page) {
        html += `<span class="px-3 py-1.5 bg-[#14422f] text-white rounded-[6px] text-xs font-bold">${p}</span>`;
      } else {
        html += `<button onclick="renderUsersPage(${p})" class="px-3 py-1.5 border border-[#ddd9d3] rounded-[6px] text-xs font-semibold bg-white hover:bg-[#faf9f5]">${p}</button>`;
      }
    }
    html += `<button ${page >= totalPages ? 'disabled' : ''} onclick="renderUsersPage(${page + 1})" class="disabled:opacity-40 px-3 py-1.5 border border-[#ddd9d3] rounded-[6px] text-xs font-semibold bg-white hover:bg-[#faf9f5]">Sonraki</button>`;
    container.innerHTML = html;
  }
}

/**
 * Daha fazla göster / daha az göster toggle.
 */
export function initToggleLoadMore(): void {
  (window as any).toggleLoadMoreUsers = function (): void {
    usersState.isExpandedUserView = !usersState.isExpandedUserView;
    const loadMoreLabel = document.getElementById('load-more-label');
    const loadMoreIcon = document.getElementById('load-more-icon');
    const paginationContainer = document.getElementById('user-pagination-container');

    if (usersState.isExpandedUserView) {
      if (loadMoreLabel) loadMoreLabel.textContent = 'Daha az göster';
      if (loadMoreIcon) loadMoreIcon.textContent = 'expand_less';
      if (paginationContainer) paginationContainer.classList.remove('hidden');
      renderUsersPage(1);
    } else {
      if (loadMoreLabel) loadMoreLabel.textContent = 'Daha fazla göster';
      if (loadMoreIcon) loadMoreIcon.textContent = 'expand_more';
      if (paginationContainer) paginationContainer.classList.add('hidden');
      renderInitialUsersView();
    }
  };

  // renderUsersPage'i global yap — HTML onclick'ten çağrılıyor
  (window as any).renderUsersPage = renderUsersPage;
}
