/**
 * Analyses sayfası için paylaşılan mutable state.
 * selectedCvId ve activeInterval tüm modüller tarafından bu referans üzerinden okunur/yazılır.
 */
export const analysesState: {
  selectedCvId: string | null;
  activeInterval: ReturnType<typeof setInterval> | null;
} = {
  selectedCvId: null,
  activeInterval: null
};
