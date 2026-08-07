/**
 * candProfileState.ts (Admin Aday Detay Ortak Durum Hafızası)
 * Görevi: Admin panelinde incelenen adayın CV listesini (candidateCvs),
 * o an seçili aktif CV ID'sini (activeCvId) ve aday kullanıcı ID'sini (candidateUserId) modüller arası saklar.
 * aday detay sayfasının beynidir tam anlamıyla
 */
export const candProfileState = {
  candidateCvs: [] as any[],
  activeCvId: null as string | null,
  candidateUserId: null as string | null
};
