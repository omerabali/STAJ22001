/**
 * userRowRenderer.ts (Kullanıcı Tablo Satır Çizicisi)
 * Görevi: Kullanıcı yönetimi tablosundaki her bir satırı (kullanıcı adı, e-posta, rol rozeti,
 * kayıt tarihi, onay kutusu ve sil/düzenle eylem butonları) HTML olarak çizer.
 */
import { usersState } from './usersState';
export function renderUserRows(users: any[]): void {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-[#8a8580] font-medium">Kullanıcı bulunamadı.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => {
    const date = new Date(user.createdAt).toLocaleDateString('tr-TR');
    const userName = user.name || user.email || 'Kullanıcı';
    const initials = userName.substring(0, 2).toUpperCase();
    const isMe = usersState.currentUserId === user.id;
    const isChecked = usersState.selectedUserIds.has(user.id);

    return `
      <tr class="hover:bg-[#f5f4f0]/40 transition-colors duration-150 group">
        <td class="p-4">
          <input type="checkbox" value="${user.id}" ${isChecked ? 'checked' : ''} onchange="toggleSelectUser('${user.id}', this.checked)" class="user-checkbox rounded border-[#ddd9d3] text-[#14422f] focus:ring-[#14422f]" />
        </td>
        <td class="p-4">
          <div class="flex items-center gap-3">
            ${user.avatarUrl
              ? `<img src="${user.avatarUrl}" alt="${userName}" class="w-8 h-8 rounded-full object-cover shrink-0 border border-[#ddd9d3]" />`
              : `<div class="w-8 h-8 rounded-full bg-[#14422f]/10 text-[#14422f] flex items-center justify-center font-bold text-xs shrink-0">${initials}</div>`
            }
            <span class="font-bold text-[#1b1c1a] text-sm">${user.name || 'İsimsiz'}</span>
            ${isMe ? '<span class="bg-[#faf9f5] border border-[#ddd9d3] text-[#1b1c1a] px-2 py-0.5 rounded text-xs ml-2 font-medium">Sen</span>' : ''}
          </div>
        </td>
        <td class="p-4 text-[#8a8580] font-medium">${user.email}</td>
        <td class="p-4 text-[#8a8580] font-medium">${date}</td>
        <td class="p-4">
          ${user.role === 'ADMIN'
            ? '<span class="bg-[#14422f] text-white px-2.5 py-1 rounded-[6px] font-bold text-xs">Yönetici</span>'
            : '<span class="bg-[#14422f]/10 text-[#14422f] px-2.5 py-1 rounded-[6px] font-semibold text-xs">Aday</span>'}
        </td>
        <td class="p-4 text-right">
          ${isMe
            ? '<span class="text-[#8a8580] text-xs font-medium">Yetki değiştirilemez</span>'
            : user.role === 'ADMIN'
              ? '<span class="text-[#8a8580] text-xs font-medium italic flex items-center gap-1 justify-end"><span class="material-symbols-outlined text-sm">lock</span>Yönetici korumalı</span>'
              : `<div class="flex items-center justify-end gap-2">
                   <button onclick="deleteCandidate('${user.id}', '${user.name || user.email}')" title="Adayı Sil" class="p-1.5 border border-rose-200 rounded-[8px] bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-sm flex items-center justify-center">
                     <span class="material-symbols-outlined text-base">delete</span>
                   </button>
                   <button onclick="changeRole('${user.id}', 'ADMIN')" class="px-3 py-1.5 border border-[#ddd9d3] rounded-[8px] bg-white text-[#1b1c1a] hover:border-[#14422f] hover:text-[#14422f] text-xs font-semibold transition-all shadow-sm">Yönetici Yap</button>
                 </div>`
          }
        </td>
      </tr>
    `;
  }).join('');
}
