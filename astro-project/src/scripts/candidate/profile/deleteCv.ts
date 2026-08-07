/**
 * deleteCv.ts (Profil CV Silme Yöneticisi)
 * Görevi: Aday profil sayfasında sil ikonuna tıklandığında onay ister,
 * `/api/cv/${cvId}` ucuna DELETE isteği atıp CV'yi siler ve önbelleği sıfırlayarak listeyi yeniler.
 */
export async function deleteCV(cvId: string, options?: {
  onSuccess?: () => void;
  onSelectedCvDeleted?: () => void;
}): Promise<void> {
  if (!confirm('Bu CV ve tüm ilişkili verileri silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch(`/api/cv/${cvId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Silme işlemi başarısız.');
    }
    
    options?.onSelectedCvDeleted?.();

    if ((window as any).__swrCache) {
      (window as any).__swrCache.invalidate('user-cvs');
      (window as any).__swrCache.invalidate('user-analyses');
    }

    options?.onSuccess?.();
  } catch (err: any) {
    console.error(err);
    alert(err.message);
  }
}
