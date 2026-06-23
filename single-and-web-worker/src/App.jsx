import { useState, useEffect, useRef } from 'react';

// Web Worker code as a string to be compiled dynamically via Blob URL
const workerCode = `
  self.onmessage = function(e) {
    const n = e.data;
    const start = performance.now();
    
    function fib(x) {
      if (x <= 1) return x;
      return fib(x - 1) + fib(x - 2);
    }
    
    const result = fib(n);
    const end = performance.now();
    self.postMessage({ 
      result: result.toLocaleString(), 
      duration: (end - start).toFixed(2) 
    });
  };
`;

function App() {
  const [n, setN] = useState(41);
  
  // Main thread states
  const [isMainRunning, setIsMainRunning] = useState(false);
  const [mainResult, setMainResult] = useState(null);
  const [mainTypedText, setMainTypedText] = useState('');
  const [mainClicks, setMainClicks] = useState(0);
  
  // Web worker states
  const [isWorkerRunning, setIsWorkerRunning] = useState(false);
  const [workerResult, setWorkerResult] = useState(null);
  const [workerTypedText, setWorkerTypedText] = useState('');
  const [workerClicks, setWorkerClicks] = useState(0);
  
  // Continuous ticking indicator (main thread event loop monitor)
  const [tick, setTick] = useState(0);
  
  // Ref for active Web Worker
  const workerRef = useRef(null);

  // Setup continuous ticking monitor on mount
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 40); // fast tick to make freezes instantly obvious
    
    return () => clearInterval(interval);
  }, []);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Approximates the number of recursive operations for fib(n)
  const getOperationsCount = (val) => {
    const phi = (1 + Math.sqrt(5)) / 2;
    const fibVal = Math.round(Math.pow(phi, val) / Math.sqrt(5));
    const ops = 2 * fibVal - 1;
    if (ops >= 1e9) {
      return `${(ops / 1e9).toFixed(2)} Milyar`;
    }
    if (ops >= 1e6) {
      return `${(ops / 1e6).toFixed(1)} Milyon`;
    }
    return ops.toLocaleString();
  };

  // Standard recursive Fibonacci (O(2^n) complexity)
  const fibRecursive = (x) => {
    if (x <= 1) return x;
    return fibRecursive(x - 1) + fibRecursive(x - 2);
  };

  // Run calculation directly on the main thread (blocking)
  const handleMainThreadRun = () => {
    setIsMainRunning(true);
    setMainResult(null);
    
    // We wrap in a short setTimeout to allow the browser to paint the state change
    // ("UI BLOKE EDİLDİ" message, state transition) BEFORE the CPU blocks.
    setTimeout(() => {
      const start = performance.now();
      const result = fibRecursive(n);
      const end = performance.now();
      
      setMainResult({
        result: result.toLocaleString(),
        duration: (end - start).toFixed(2)
      });
      setIsMainRunning(false);
    }, 50);
  };

  // Run calculation offloaded to a Web Worker (non-blocking)
  const handleWebWorkerRun = () => {
    setIsWorkerRunning(true);
    setWorkerResult(null);
    
    // Create Blob from worker script
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    const worker = new Worker(workerUrl);
    workerRef.current = worker;
    
    worker.onmessage = (e) => {
      const { result, duration } = e.data;
      setWorkerResult({ result, duration });
      setIsWorkerRunning(false);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      workerRef.current = null;
    };
    
    worker.onerror = (err) => {
      console.error('Worker error:', err);
      setWorkerResult({ result: 'Hata', duration: 'N/A' });
      setIsWorkerRunning(false);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      workerRef.current = null;
    };
    
    worker.postMessage(n);
  };

  // Cancel Web Worker execution
  const handleCancelWorker = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setWorkerResult({ result: 'İptal Edildi', duration: 'N/A' });
      setIsWorkerRunning(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Main Thread vs. Web Worker</h1>
      </header>

      {/* Control Slider */}
      <div className="controls-card">
        <div className="slider-container">
          <label htmlFor="fib-slider" className="slider-label">
            <span>Hesaplanacak Fibonacci Derecesi (N):</span>
            <span className="slider-value">F({n})</span>
          </label>
          <input
            id="fib-slider"
            type="range"
            min="35"
            max="46"
            value={n}
            onChange={(e) => setN(parseInt(e.target.value))}
            className="custom-slider"
            disabled={isMainRunning || isWorkerRunning}
          />
          <div className="slider-info">
            Tahmini İşlem Yükü: ~{getOperationsCount(n)} rekürsif çağrı.
            {n > 42 && (
              <span style={{ color: 'var(--color-blocked)', display: 'block', marginTop: '0.25rem', fontWeight: 600 }}>
                ⚠️ Uyarı: Main Thread üzerinde {n} hesaplamak tarayıcınızı 5-20 saniye kilitleyebilir!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard containing two columns */}
      <main className="dashboard">
        
        {/* Left Panel: Main Thread */}
        <section className="panel main-thread-panel" aria-labelledby="main-thread-heading">
          <header className="panel-header">
            <h2 id="main-thread-heading" className="panel-title">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              Main Thread
            </h2>
            <div className="status-badge" id="main-thread-status">
              <span className={`status-dot ${isMainRunning ? 'blocked active' : 'responsive'}`}></span>
              <span>{isMainRunning ? 'UI BLOKE EDİLDİ' : 'Arayüz Aktif'}</span>
            </div>
          </header>

          {/* Liveliness Testing Section */}
          <div className="test-section">
            <h3 className="test-section-title">Arayüz Canlılık Testi</h3>
            
            <div className="monitor-row">
              <span className="monitor-label">Canlı Animasyon:</span>
              <div className="animation-track">
                <div className={`animation-bar ${isMainRunning ? 'paused' : ''}`} />
              </div>
            </div>

            <div className="monitor-row">
              <span className="monitor-label">Canlı Sayaç:</span>
              <span className="monitor-value-tick">{tick}</span>
            </div>

            <div className="interactive-tests">
              <div className="test-input-group">
                <label className="test-input-label" htmlFor="main-text">Yazı Yazma Testi:</label>
                <input
                  id="main-text"
                  type="text"
                  placeholder="Donmayı test etmek için yazın..."
                  value={mainTypedText}
                  onChange={(e) => setMainTypedText(e.target.value)}
                  className="test-text-input"
                  disabled={false} // intentionally active to show blocking behavior
                />
              </div>

              <button
                onClick={() => setMainClicks((c) => c + 1)}
                className="btn-test-click"
              >
                Tıklama Testi: {mainClicks} tık
              </button>
            </div>
          </div>

          <button
            onClick={handleMainThreadRun}
            className="btn-trigger btn-main-thread"
            disabled={isMainRunning || isWorkerRunning}
            aria-describedby="main-thread-status"
          >
            <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
            </svg>
            Main Thread Bloke Et
          </button>

          {/* Metrics Results */}
          <div className="results-container">
            <div className="metric-row">
              <span className="metric-label">Durum:</span>
              <span className="metric-value" style={{ color: isMainRunning ? 'var(--color-blocked)' : 'var(--color-success)', fontWeight: 'bold' }}>
                {isMainRunning ? 'Hesaplanıyor (Dondu)' : 'Hazır'}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Hesaplanan Sonuç:</span>
              <span className="metric-value highlight">{mainResult ? mainResult.result : '-'}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Geçen Süre:</span>
              <span className="metric-value duration">{mainResult ? `${mainResult.duration} ms` : '-'}</span>
            </div>
          </div>
        </section>

        {/* Right Panel: Web Worker */}
        <section className="panel web-worker-panel" aria-labelledby="web-worker-heading">
          <header className="panel-header">
            <h2 id="web-worker-heading" className="panel-title">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
              Web Worker
            </h2>
            <div className="status-badge" id="worker-status">
              <span className={`status-dot ${isWorkerRunning ? 'running active' : 'responsive'}`}></span>
              <span>{isWorkerRunning ? 'WORKER ÇALIŞIYOR' : 'Arayüz Aktif'}</span>
            </div>
          </header>

          {/* Liveliness Testing Section */}
          <div className="test-section">
            <h3 className="test-section-title">Arayüz Canlılık Testi</h3>
            
            <div className="monitor-row">
              <span className="monitor-label">Canlı Animasyon:</span>
              <div className="animation-track">
                <div className="animation-bar" />
              </div>
            </div>

            <div className="monitor-row">
              <span className="monitor-label">Canlı Sayaç:</span>
              <span className="monitor-value-tick">{tick}</span>
            </div>

            <div className="interactive-tests">
              <div className="test-input-group">
                <label className="test-input-label" htmlFor="worker-text">Yazı Yazma Testi:</label>
                <input
                  id="worker-text"
                  type="text"
                  placeholder="Donmayı test etmek için yazın..."
                  value={workerTypedText}
                  onChange={(e) => setWorkerTypedText(e.target.value)}
                  className="test-text-input"
                />
              </div>

              <button
                onClick={() => setWorkerClicks((c) => c + 1)}
                className="btn-test-click"
              >
                Tıklama Testi: {workerClicks} tık
              </button>
            </div>
          </div>

          {isWorkerRunning ? (
            <button
              onClick={handleCancelWorker}
              className="btn-trigger"
              style={{ background: 'linear-gradient(135deg, hsl(38, 92%, 50%) 0%, hsl(20, 92%, 45%) 100%)', boxShadow: '0 4px 20px rgba(245, 158, 11, 0.2)' }}
              aria-describedby="worker-status"
            >
              <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              İşlemi İptal Et (Kill Worker)
            </button>
          ) : (
            <button
              onClick={handleWebWorkerRun}
              className="btn-trigger btn-web-worker"
              disabled={isMainRunning || isWorkerRunning}
              aria-describedby="worker-status"
            >
              <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Web Worker ile Çalıştır
            </button>
          )}

          {/* Metrics Results */}
          <div className="results-container">
            <div className="metric-row">
              <span className="metric-label">Durum:</span>
              <span className="metric-value" style={{ color: isWorkerRunning ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: 'bold' }}>
                {isWorkerRunning ? 'Hesaplanıyor (Arka Planda)' : 'Hazır'}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Hesaplanan Sonuç:</span>
              <span className="metric-value highlight">{workerResult ? workerResult.result : '-'}</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Geçen Süre:</span>
              <span className="metric-value duration">{workerResult ? `${workerResult.duration} ms` : '-'}</span>
            </div>
          </div>
        </section>
      </main>

      {/* Info Explanation Card */}
      <footer className="info-box" role="note">
        <svg className="info-box-icon" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm0-4h-2V7h2v7z"/>
        </svg>
        <div className="info-box-text">
          <strong>Nasıl Test Edilir?</strong>
          <p style={{ marginTop: '0.25rem', color: 'var(--text-muted)' }}>
            1. Üstteki kaydırıcıdan <strong>F(42)</strong> veya üzeri bir değer seçin.<br/>
            2. Sol paneldeki <strong>"Main Thread Bloke Et"</strong> butonuna tıklayın. Hesaplama esnasında <strong>Canlı Animasyonun</strong> durduğunu, <strong>Canlı Sayacın</strong> donduğunu, <strong>Yazı Yazma Testi</strong> kutusuna yazamadığınızı ve <strong>Tıklama Testi</strong> butonunun tepki vermediğini gözlemleyin.<br/>
            3. Sağ paneldeki <strong>"Web Worker ile Çalıştır"</strong> butonuna tıklayın. Hesaplama arka planda yapılırken animasyonun akmaya devam ettiğini, sayaçların arttığını, yazı yazabildiğinizi ve butonların tepki verdiğini gözlemleyin.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
