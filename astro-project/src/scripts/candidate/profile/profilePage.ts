/**
 * Profile Sayfası Orkestratörü
 * Tüm profile modüllerini (cvUploader, profile/*) bir araya getirir.
 * Drop zone kurulumu, CV yükleme, kullanıcı oturumu ve liste yönetimini yönetir.
 */
import { uploadCV } from '../../shared/cvUploader';
import { updateStepUI } from '../../shared/stepperTimeline';
import { deleteCV } from './deleteCv';
import { showLiveProcessingState } from './liveStateUi';
import { createCvListLoader } from './cvListLoader';
import { initAnalysisSocketListener } from './socketLogic';

const state: {
  activeInterval: any;
  selectedCvId: string | null;
  isAnalysisCompleted: boolean;
} = {
  activeInterval: null,
  selectedCvId: null,
  isAnalysisCompleted: false
};

// window.deleteCV global — HTML onclick="deleteCV('id')" ile çağrılır
(window as any).deleteCV = (cvId: string) => {
  deleteCV(cvId, {
    onSelectedCvDeleted: () => {
      if (state.selectedCvId === cvId) {
        state.selectedCvId = null;
        document.getElementById('no-analysis-state')?.classList.remove('hidden');
        document.getElementById('active-analysis-state')?.classList.add('hidden');
      }
    },
    onSuccess: () => loadCVList()
  });
};

const loadCVList = createCvListLoader(state);
const socket = initAnalysisSocketListener(state, loadCVList);

async function loadUserSession(): Promise<void> {
  const fetcher = async () => {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Fetch user profile error');
    return res.json();
  };

  const render = (data: any) => {
    if (data.user) {
      const welcomeEl = document.getElementById('welcome-name');
      if (welcomeEl) welcomeEl.textContent = data.user.name || data.user.email.split('@')[0];
    }
  };

  if ((window as any).__swrCache) {
    (window as any).__swrCache.query('user-profile', fetcher, render, 30000);
  } else {
    fetcher().then(render).catch(console.error);
  }
}

async function handleCVUpload(file: File): Promise<void> {
  const progressContainer = document.getElementById('upload-progress-container');
  const progressBar = document.getElementById('upload-progress-bar');
  const percentText = document.getElementById('upload-percent');
  const statusText = document.getElementById('upload-status-text');

  if (!progressContainer || !progressBar || !percentText || !statusText) return;

  state.isAnalysisCompleted = false;
  state.selectedCvId = null;

  progressContainer.classList.remove('hidden');
  const fileNameEl = document.getElementById('upload-file-name');
  if (fileNameEl) fileNameEl.textContent = file.name;
  updateStepUI(1, 'CV sunucuya gönderiliyor...');

  uploadCV({
    file,
    onProgress: (uploadPct: number, overallPct: number, textStatus: string) => {
      progressBar.style.width = overallPct + '%';
      percentText.textContent = overallPct + '%';
      statusText.textContent = textStatus;
    },
    onSuccess: (data: any) => {
      statusText.textContent = 'CV başarıyla yüklendi, analiz sıraya alındı...';
      if ((window as any).__swrCache) {
        (window as any).__swrCache.invalidate('user-cvs');
        (window as any).__swrCache.invalidate('user-analyses');
      }
      state.selectedCvId = data.cv?.id || null;
      showLiveProcessingState(data.cv?.fileName || 'Yüklenen Özgeçmiş');
      if (socket && state.selectedCvId) {
        socket.emit('join:cv', state.selectedCvId);
        console.log('[Profile] 📡 Socket odasına katılındı:', state.selectedCvId);
      }
      loadCVList();
    },
    onError: (msg: string) => {
      if (msg.includes('Maksimum dosya boyutu') || msg.includes('PDF dosyası')) alert(msg);
      statusText.textContent = 'Hata: ' + msg;
      progressBar.style.width = '100%';
      progressBar.style.backgroundColor = 'rgba(220,38,38,0.6)';
    }
  });
}

function setupDropZone(): void {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('cv-file-input') as HTMLInputElement;
  if (!dropZone || !fileInput) return;

  const selectBtn = dropZone.querySelector('button');
  selectBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.value = '';
    fileInput.click();
  });

  dropZone.addEventListener('click', (e) => {
    if (e.target === selectBtn) return;
    fileInput.value = '';
    fileInput.click();
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-[#14422f]/50', 'bg-[#14422f]/5');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-[#14422f]/50', 'bg-[#14422f]/5');
  });
  dropZone.addEventListener('drop', (e: DragEvent) => {
    e.preventDefault();
    dropZone.classList.remove('border-[#14422f]/50', 'bg-[#14422f]/5');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) handleCVUpload(files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) handleCVUpload(fileInput.files[0]);
  });
}

export function initProfilePage(): void {
  const listBody = document.getElementById('profile-cvs-body') as HTMLElement;
  if (listBody && !listBody.dataset.initialized) {
    listBody.dataset.initialized = 'true';
    setupDropZone();
    loadUserSession();
    loadCVList();
  }
}
