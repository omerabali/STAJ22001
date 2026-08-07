/**
 * analysesState.ts (Analizler Sayfası Ortak Durum Hafızası)
 * Görevi: Analizler sayfasında o an seçili olan CV'nin ID'sini (selectedCvId)
 * ve canlı yenileme zamanlayıcısını (activeInterval) modüller arası ortak hafızada tutar.
 * sistemin beyni gibi görev yapar o an seçili olan cvnin id sini ve analizlerinin hafızada tutar
 */
export const analysesState: {
  selectedCvId: string | null;
  activeInterval: ReturnType<typeof setInterval> | null;
} = {
  selectedCvId: null,
  activeInterval: null
};
