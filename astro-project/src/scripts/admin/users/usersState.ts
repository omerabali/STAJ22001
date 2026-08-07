/**
 * usersState.ts (Kullanıcı Yönetimi Ortak Durum Hafızası)
 * Görevi: Tüm kullanıcı listesini (allUsersList), filtrelenmiş listeyi (filteredUsersList),
 * seçili kullanıcı ID'lerini (selectedUserIds) ve sayfa numaralarını ortak hafızada tutar.
 * kullanıcı yönetim kısmının beynidir tam olarak
 */
export const usersState = {
  currentUserId: null as string | null,
  allUsersList: [] as any[],
  filteredUsersList: [] as any[],
  isExpandedUserView: false,
  userCurrentPage: 1,
  selectedUserIds: new Set<string>(),
  rawCandidateData: [] as any[],
  candidateFilterCurrentPage: 1,
  candidateFilteredList: [] as any[]
};
