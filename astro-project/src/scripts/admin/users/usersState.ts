/** Users sayfası için paylaşılan state nesnesi */
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
