/**
 * cvUploader.ts (Ortak CV Yükleme ve İlerleme Yöneticisi)
 * Görevi: İstemci tarafında PDF uzantı ve 5MB boyut kontrolünü yapar.
 * XHR (XMLHttpRequest) kullanarak CV dosyasını backend'e (`/api/cv/upload`) yükler ve yükleme yüzdesini (%0 - %100) canlı hesaplar.
 */

export interface UploadOptions {
  file: File;
  targetUserId?: string;
  onProgress?: (uploadPercent: number, overallPercent: number, textStatus: string) => void;
  onSuccess?: (data: any) => void;
  onError?: (errorMessage: string) => void;
}

export function uploadCV(options: UploadOptions): void {
  const { file, targetUserId, onProgress, onSuccess, onError } = options;

  if (file.type !== "application/pdf") {
    onError?.("Lütfen sadece PDF dosyası yükleyin.");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    onError?.("Maksimum dosya boyutu limitini (5MB) aştınız.");
    return;
  }

  const formData = new FormData();
  formData.append("cv", file);
  if (targetUserId) {
    formData.append("targetUserId", targetUserId);
  }

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener("progress", (e) => {
    if (!e.lengthComputable) return;
    const uploadPct = Math.round((e.loaded / e.total) * 100);
    const overallPct = Math.round((uploadPct / 100) * 20);
    const statusText = uploadPct < 100 ? `Dosya yükleniyor... %${uploadPct}` : "Sunucu işliyor...";
    onProgress?.(uploadPct, overallPct, statusText);
  });

  xhr.addEventListener("load", () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const data = JSON.parse(xhr.responseText);
        onSuccess?.(data);
      } catch (err) {
        onError?.("Sunucu yanıtı okunamadı.");
      }
    } else {
      let msg = "Yükleme başarısız.";
      try {
        msg = JSON.parse(xhr.responseText).message || msg;
      } catch {}
      onError?.(msg);
    }
  });

  xhr.addEventListener("error", () => {
    onError?.("Ağ hatası oluştu.");
  });

  xhr.open("POST", "/api/cv/upload");
  xhr.send(formData);
}
