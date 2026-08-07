/**
 * deleteAndRetry.ts (Admin CV Silme & Yeniden İşleme Yöneticisi)
 * Görevi: Yükleme tablosundaki bir CV'yi tamamen silme (deleteAdminCV)
 * veya hatalı/bekleyen bir CV'yi yeniden işleme sokma (retryAdminCV) işlemlerini yürütür.
 */
export async function deleteCV(cvId: string, activeCvIdState: { activeCvId: string | null }, loadCVList: () => void): Promise<void> {
  if (!confirm('Bu CV ve tüm ilişkili verileri silmek istediğinize emin misiniz?')) return;
  try {
    const res = await fetch(`/api/cv/${cvId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).message || 'Silme başarısız.');
    if (activeCvIdState.activeCvId === cvId) {
      activeCvIdState.activeCvId = null;
      document.getElementById('chunk-viewer-section')?.classList.add('hidden');
    }
    await loadCVList();
  } catch (err: any) { alert(err.message); }
}

export async function retryCV(cvId: string, loadCVList: () => void): Promise<void> {
  try {
    const res = await fetch(`/api/cv/${cvId}/retry`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).message || 'Yeniden deneme başarısız.');
    await loadCVList();
  } catch (err: any) { alert(err.message); }
}
