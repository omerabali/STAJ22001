import { useState, useEffect, useRef } from 'react';

// Web Worker code as a string to be compiled dynamically via Blob URL
const workerCode = `
  self.onmessage = function(e) {
    const { taskId, start, end } = e.data;
    let count = 0;
    const total = end - start + 1;
    
    // Progress reporting frequency (approx. every 5% of range)
    const reportInterval = Math.max(1, Math.floor(total / 20));
    
    function isPrime(num) {
      if (num <= 1) return false;
      if (num === 2) return true;
      if (num % 2 === 0) return false;
      const s = Math.sqrt(num);
      for (let i = 3; i <= s; i += 2) {
          if (num % i === 0) return false;
      }
      return true;
    }
    
    const tStart = performance.now();
    for (let i = start; i <= end; i++) {
      if (isPrime(i)) {
        count++;
      }
      
      if ((i - start) % reportInterval === 0 || i === end) {
        const progress = Math.min(100, Math.round(((i - start) / total) * 100));
        self.postMessage({
          type: 'progress',
          taskId: taskId,
          progress: progress
        });
      }
    }
    const tEnd = performance.now();
    
    self.postMessage({
      type: 'done',
      taskId: taskId,
      result: count,
      duration: tEnd - tStart
    });
  };
`;

function App() {
  // Config states
  const [maxRangeLimit, setMaxRangeLimit] = useState(4000000);
  const [threadCount, setThreadCount] = useState(4); // 1 | 2 | 4 | 8
  
  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [simDuration, setSimDuration] = useState(null);
  
  // Run history comparison
  const [runHistory, setRunHistory] = useState([]);
  
  // Live UI Liveliness monitor states
  const [tick, setTick] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  
  // Refs for background orchestration
  const tasksRef = useRef([]);
  const queueRef = useRef([]);
  const workersRef = useRef([]);
  const activeWorkersRef = useRef([]);
  const simStartTimeRef = useRef(null);

  // Maintain a fast tick interval to demonstrate that the UI remains completely responsive
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 10000);
    }, 30);
    return () => clearInterval(timer);
  }, []);

  // High-frequency elapsed time updater using requestAnimationFrame
  useEffect(() => {
    let animationFrameId;
    const updateElapsed = () => {
      if (isRunning && simStartTimeRef.current) {
        setElapsed(performance.now() - simStartTimeRef.current);
        animationFrameId = requestAnimationFrame(updateElapsed);
      }
    };
    if (isRunning) {
      animationFrameId = requestAnimationFrame(updateElapsed);
    } else {
      setElapsed(0);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning]);

  // Cleanup worker threads on component unmount
  useEffect(() => {
    return () => {
      activeWorkersRef.current.forEach((w) => w.terminate());
    };
  }, []);

  // Helper formatting functions
  const formatNumber = (num) => num.toLocaleString('tr-TR');
  
  const formatTime = (ms) => {
    if (ms === null || ms === undefined) return '-';
    if (ms < 1000) return `${ms.toFixed(1)} ms`;
    return `${(ms / 1000).toFixed(2)} sn`;
  };

  // Divide the range [2, maxRangeLimit] into 'count' tasks
  const generateTasks = (limit, count) => {
    const startNum = 2;
    const totalNumbers = limit - startNum + 1;
    const rangeSize = Math.floor(totalNumbers / count);
    const taskList = [];

    for (let i = 0; i < count; i++) {
      const taskStart = startNum + i * rangeSize;
      const taskEnd = i === count - 1 ? limit : taskStart + rangeSize - 1;
      taskList.push({
        id: i + 1,
        start: taskStart,
        end: taskEnd,
        status: 'pending', // 'pending' | 'running' | 'completed'
        progress: 0,
        result: null,
        startTime: null,
        endTime: null,
        duration: null,
        threadId: null
      });
    }
    return taskList;
  };

  // Start the simulation
  const handleStart = () => {
    if (isRunning) return;

    // Reset previous run data
    setSimDuration(null);
    setElapsed(0);

    // Automatically determine task chunks for optimal load balancing
    const dynamicTaskCount = Math.max(threadCount * 4, 32);
    const initialTasks = generateTasks(maxRangeLimit, dynamicTaskCount);
    setTasks(initialTasks);
    tasksRef.current = JSON.parse(JSON.stringify(initialTasks));

    setIsRunning(true);

    const startSimTime = performance.now();
    simStartTimeRef.current = startSimTime;

    // Reset queues
    const queue = initialTasks.map((_, idx) => idx);
    queueRef.current = queue;

    // Initialize worker UI state
    const initialWorkers = Array.from({ length: threadCount }, (_, i) => ({
      id: i + 1,
      status: 'idle',
      activeTaskId: null,
      progress: 0
    }));
    setWorkers(initialWorkers);
    workersRef.current = JSON.parse(JSON.stringify(initialWorkers));

    // Spawn Web Workers dynamically
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    const activeWorkers = Array.from({ length: threadCount }, () => new Worker(workerUrl));
    activeWorkersRef.current = activeWorkers;

    // Message coordinator
    const handleWorkerMessage = (workerIdx, e) => {
      const msg = e.data;
      const workerId = workerIdx + 1;

      if (msg.type === 'progress') {
        const { taskId, progress } = msg;

        // Update task progress in task list ref
        tasksRef.current = tasksRef.current.map((t) =>
          t.id === taskId ? { ...t, progress } : t
        );
        setTasks([...tasksRef.current]);

        // Update progress in worker status ref
        workersRef.current = workersRef.current.map((w) =>
          w.id === workerId ? { ...w, progress } : w
        );
        setWorkers([...workersRef.current]);

      } else if (msg.type === 'done') {
        const { taskId, result, duration } = msg;
        const endOffset = performance.now() - simStartTimeRef.current;

        // Complete task
        tasksRef.current = tasksRef.current.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: 'completed',
                progress: 100,
                result,
                endTime: endOffset,
                duration
              }
            : t
        );
        setTasks([...tasksRef.current]);

        // Set worker to idle
        workersRef.current = workersRef.current.map((w) =>
          w.id === workerId ? { ...w, status: 'idle', activeTaskId: null, progress: 0 } : w
        );
        setWorkers([...workersRef.current]);

        // Dispatch next task to this worker
        dispatchNextTask(workerIdx);
      }
    };

    // Set message handlers
    activeWorkers.forEach((worker, idx) => {
      worker.onmessage = (e) => handleWorkerMessage(idx, e);
      worker.onerror = (err) => {
        console.error(`Worker #${idx + 1} hatası:`, err);
        const workerId = idx + 1;
        const activeW = workersRef.current.find((w) => w.id === workerId);
        if (activeW && activeW.activeTaskId) {
          const tId = activeW.activeTaskId;
          const endOffset = performance.now() - simStartTimeRef.current;
          
          // Mark task as failed/completed with 0 results
          tasksRef.current = tasksRef.current.map((t) =>
            t.id === tId
              ? {
                  ...t,
                  status: 'completed',
                  progress: 100,
                  result: 0,
                  endTime: endOffset,
                  duration: 0
                }
              : t
          );
          setTasks([...tasksRef.current]);
        }

        workersRef.current = workersRef.current.map((w) =>
          w.id === workerId ? { ...w, status: 'idle', activeTaskId: null, progress: 0 } : w
        );
        setWorkers([...workersRef.current]);
        dispatchNextTask(idx);
      };
    });

    // Distribute tasks dynamically
    const dispatchNextTask = (workerIdx) => {
      const workerId = workerIdx + 1;

      if (queueRef.current.length > 0) {
        const taskIdx = queueRef.current.shift();
        const task = tasksRef.current[taskIdx];
        const startOffset = performance.now() - simStartTimeRef.current;

        // Update task to running state
        tasksRef.current[taskIdx] = {
          ...task,
          status: 'running',
          startTime: startOffset,
          threadId: workerId
        };
        setTasks([...tasksRef.current]);

        // Update worker to busy state
        workersRef.current = workersRef.current.map((w) =>
          w.id === workerId ? { ...w, status: 'busy', activeTaskId: task.id, progress: 0 } : w
        );
        setWorkers([...workersRef.current]);

        // Post message to worker
        activeWorkersRef.current[workerIdx].postMessage({
          taskId: task.id,
          start: task.start,
          end: task.end
        });

      } else {
        // Check if all tasks have been completed
        const allCompleted = tasksRef.current.every((t) => t.status === 'completed');
        if (allCompleted) {
          const endSimTime = performance.now();
          const totalDuration = endSimTime - simStartTimeRef.current;

          setSimDuration(totalDuration);
          setIsRunning(false);

          // Terminate workers & revoke url
          activeWorkersRef.current.forEach((w) => w.terminate());
          activeWorkersRef.current = [];
          URL.revokeObjectURL(workerUrl);

          // Append to run history
          setRunHistory((prev) => [
            {
              id: Date.now(),
              mode: `${threadCount} Thread (Worker)`,
              threadCount: threadCount,
              rangeLimit: maxRangeLimit,
              duration: totalDuration,
              tasks: JSON.parse(JSON.stringify(tasksRef.current))
            },
            ...prev
          ]);
        }
      }
    };

    // Initialize calculations
    for (let w = 0; w < threadCount; w++) {
      dispatchNextTask(w);
    }
  };

  // Terminate workers early
  const handleStop = () => {
    if (!isRunning) return;

    activeWorkersRef.current.forEach((w) => w.terminate());
    activeWorkersRef.current = [];

    // Reset task states
    const cancelledTasks = tasks.map((t) =>
      t.status === 'running' || t.status === 'pending'
        ? { ...t, status: 'pending', progress: 0 }
        : t
    );
    setTasks(cancelledTasks);

    // Reset worker states
    const resetWorkers = workers.map((w) => ({
      ...w,
      status: 'idle',
      activeTaskId: null,
      progress: 0
    }));
    setWorkers(resetWorkers);

    setIsRunning(false);
  };

  const clearHistory = () => {
    setRunHistory([]);
  };

  // Compute stats for historical speedup comparisons
  const getSpeedup = (run) => {
    // Find a 1-Worker run to use as baseline
    const baselineRun = runHistory.find(
      (r) => r.threadCount === 1 && r.rangeLimit === run.rangeLimit
    );
    if (!baselineRun) {
      // Fallback: find the slowest run with same configuration in history
      const sameConfigRuns = runHistory.filter(
        (r) => r.rangeLimit === run.rangeLimit
      );
      if (sameConfigRuns.length <= 1) return null;
      const slowest = sameConfigRuns.reduce((prev, curr) => (prev.duration > curr.duration ? prev : curr));
      if (run.id === slowest.id) return null;
      return (slowest.duration / run.duration).toFixed(1);
    }
    if (run.id === baselineRun.id) return null;
    return (baselineRun.duration / run.duration).toFixed(1);
  };

  const fastestDuration = runHistory.length > 0 ? Math.min(...runHistory.map((r) => r.duration)) : null;
  const slowestDuration = runHistory.length > 0 ? Math.max(...runHistory.map((r) => r.duration)) : null;

  // Active run duration helper
  const totalSimElapsed = isRunning
    ? elapsed
    : simDuration !== null
    ? simDuration
    : 0;

  // Track Gantt Chart rows
  const ganttRows = Array.from({ length: threadCount }, (_, i) => i + 1);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="app-title-group">
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="app-logo-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <h1 className="app-title">ThreadLab</h1>
        </div>
        <p className="app-subtitle">JavaScript Çoklu İş Parçacığı (Multi-threading) Performans ve Yük Dağılım Laboratuvarı</p>
      </header>

      {/* Grid Layout containing control panel and thread visualizer */}
      <div className="dashboard-grid">
        
        {/* Left Column: Control Panel */}
        <section className="panel" aria-label="Kontrol Paneli">
          <div className="panel-title-bar">
            <h2 className="panel-title">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
              Simülasyon Ayarları
            </h2>
          </div>

          <div className="control-group">
            {/* Range Slider */}
            <div className="control-item">
              <label htmlFor="range-slider" className="control-label">
                <span>Arama Üst Sınırı:</span>
                <span className="control-val">2 - {formatNumber(maxRangeLimit)}</span>
              </label>
              <div className="range-slider-container">
                <input
                  id="range-slider"
                  type="range"
                  min="1000000"
                  max="10000000"
                  step="500000"
                  value={maxRangeLimit}
                  onChange={(e) => setMaxRangeLimit(parseInt(e.target.value))}
                  disabled={isRunning}
                  className="custom-range"
                />
                <span className="slider-sub-info">
                  Bu aralıktaki sayılarda asal sayı yoğunluğu analizi yapılacaktır.
                </span>
              </div>
            </div>

            {/* Thread Count */}
            <div className="control-item">
              <label className="control-label">Aktif Thread (Worker) Sayısı:</label>
              <div className="btn-options-grid">
                {[1, 2, 4, 8].map((num) => (
                  <button
                    key={num}
                    onClick={() => setThreadCount(num)}
                    disabled={isRunning}
                    className={`btn-option ${threadCount === num ? 'selected' : ''}`}
                  >
                    {num} Thread
                  </button>
                ))}
              </div>
            </div>

            {/* Sim controls */}
            <div className="simulation-triggers">
              {isRunning ? (
                <button onClick={handleStop} className="btn-stop">
                  <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Simülasyonu İptal Et (Stop)
                </button>
              ) : (
                <button onClick={handleStart} className="btn-start">
                  <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ width: '18px', height: '18px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  Simülasyonu Başlat
                </button>
              )}
            </div>

            {/* Arayüz Canlılık Göstergesi */}
            <div className="liveliness-monitor" style={{ padding: '1rem' }}>
              <div className="monitor-widgets" style={{ gap: '0.85rem' }}>
                <div className="spinner-container" style={{ width: '32px', height: '32px' }}>
                  <div className="spinning-ring" />
                </div>
                <div className="monitor-stats">
                  <div className="monitor-row-inline" style={{ fontSize: '0.8rem' }}>
                    <span>Arayüz Akıcılığı:</span>
                    <span className="monitor-val" style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="status-dot responsive active" style={{ width: '6px', height: '6px' }} />
                      %100 Akıcı
                    </span>
                  </div>
                  <div className="monitor-row-inline" style={{ fontSize: '0.8rem' }}>
                    <span>Canlı Sayaç:</span>
                    <span className="monitor-val" style={{ color: 'var(--color-success)' }}>{tick}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Live Thread Lanes */}
        <section className="panel" aria-label="Canlı Thread Lanes">
          <div className="panel-title-bar">
            <h2 className="panel-title">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25M19.5 5.25L12 11.25 4.5 5.25M12 11.25V18" />
              </svg>
              Canlı İş Parçacıkları (Thread Lanes)
            </h2>
            {isRunning && (
              <span className="lane-badge busy" style={{ animation: 'pulse 1s infinite alternate' }}>
                Süre: {formatTime(totalSimElapsed)}
              </span>
            )}
          </div>

          <div className="thread-lanes-container">
            {workers.map((worker) => {
              const activeTask = tasks.find((t) => t.id === worker.activeTaskId);
              const isBusy = worker.status === 'busy';

              return (
                <div key={worker.id} className={`thread-lane-card ${isBusy ? 'busy' : 'idle'}`}>
                  <div className="lane-header">
                    <div className="lane-info">
                      <span className="lane-title">Worker Thread #{worker.id}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {isBusy && activeTask && (
                        <span className="lane-progress-text">%{activeTask.progress}</span>
                      )}
                      <span className={`lane-badge ${isBusy ? 'busy' : 'idle'}`}>
                        {isBusy ? 'ÇALIŞIYOR' : 'BOŞTA'}
                      </span>
                    </div>
                  </div>

                  {isBusy && activeTask ? (
                    <div className="lane-task-details">
                      <div className="lane-task-title">Görev #{activeTask.id} Analiz Ediliyor</div>
                      <div className="lane-task-range">
                        Aralık: {formatNumber(activeTask.start)} - {formatNumber(activeTask.end)}
                      </div>
                      <div className="lane-progress-bar-bg">
                        <div
                          className="lane-progress-bar-fill"
                          style={{ width: `${activeTask.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="lane-task-details" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      İş parçacığı boşta, kuyruktan görev bekliyor...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Full-width Timeline / Gantt Chart */}
        <section className="panel full-width-panel" aria-label="Gantt Şeması Zaman Akışı">
          <div className="panel-title-bar">
            <h2 className="panel-title">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.625c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 013 18.75v-5.625zM10.5 7.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v10.875c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V7.875zM18 3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v15.375c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0118 18.75V3.375z" />
              </svg>
              Gantt Zaman Çizelgesi (Görevlerin Süre Dağılımı)
            </h2>
            {totalSimElapsed > 0 && (
              <span className="lane-badge">Toplam Süre: {formatTime(totalSimElapsed)}</span>
            )}
          </div>

          {tasks.some((t) => t.startTime !== null) ? (
            <div className="gantt-chart-wrapper">
              <div className="gantt-axis-x">
                <span>0 ms</span>
                <span>{formatTime(totalSimElapsed * 0.25)}</span>
                <span>{formatTime(totalSimElapsed * 0.5)}</span>
                <span>{formatTime(totalSimElapsed * 0.75)}</span>
                <span>{formatTime(totalSimElapsed)}</span>
              </div>
              <div className="gantt-timeline">
                {ganttRows.map((rowId) => {
                  const rowTasks = tasks.filter((t) => t.threadId === rowId && t.startTime !== null);
                  return (
                    <div key={rowId} className="gantt-row">
                      <div className="gantt-row-label">
                        Thread #{rowId}
                      </div>
                      <div className="gantt-row-track">
                        {rowTasks.map((task) => {
                          const start = task.startTime;
                          const end = task.endTime !== null ? task.endTime : totalSimElapsed;
                          
                          // Percentage positioning
                          const leftPct = totalSimElapsed > 0 ? (start / totalSimElapsed) * 100 : 0;
                          const widthPct = totalSimElapsed > 0 ? ((end - start) / totalSimElapsed) * 100 : 0;

                          // Colors based on status
                          const isCompleted = task.status === 'completed';
                          const gradient = isCompleted
                            ? 'linear-gradient(135deg, hsl(142, 70%, 45%) 0%, hsl(142, 70%, 35%) 100%)'
                            : 'linear-gradient(135deg, hsl(38, 92%, 50%) 0%, hsl(38, 92%, 40%) 100%)';

                          return (
                            <div
                              key={task.id}
                              className="gantt-task-block"
                              style={{
                                left: `${leftPct}%`,
                                width: `${Math.max(1.5, widthPct)}%`,
                                background: gradient
                              }}
                            >
                              G#{task.id}
                              <div className="tooltip">
                                <div className="tooltip-title">Görev #{task.id}</div>
                                <div className="tooltip-row">
                                  <span>Durum:</span>
                                  <span className="tooltip-val" style={{ color: isCompleted ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                    {isCompleted ? 'Tamamlandı' : 'Hesaplanıyor...'}
                                  </span>
                                </div>
                                <div className="tooltip-row">
                                  <span>Aralık:</span>
                                  <span className="tooltip-val">{formatNumber(task.start)} - {formatNumber(task.end)}</span>
                                </div>
                                <div className="tooltip-row">
                                  <span>Başlangıç:</span>
                                  <span className="tooltip-val">{formatTime(start)}</span>
                                </div>
                                <div className="tooltip-row">
                                  <span>Bitiş:</span>
                                  <span className="tooltip-val">{formatTime(end)}</span>
                                </div>
                                <div className="tooltip-row">
                                  <span>Süre:</span>
                                  <span className="tooltip-val">{formatTime(task.duration)}</span>
                                </div>
                                <div className="tooltip-row">
                                  <span>Asal Adedi:</span>
                                  <span className="tooltip-val">{task.result !== null ? formatNumber(task.result) : '-'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-chart-msg">
              Henüz simülasyon çalıştırılmadı. Başlat butonuna basarak şerit diyagramını izleyebilirsiniz.
            </div>
          )}
        </section>

        {/* Full-width Run History Comparison Chart */}
        <section className="panel full-width-panel" aria-label="Geçmiş Karşılaştırma Grafiği">
          <div className="panel-title-bar">
            <h2 className="panel-title">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
              </svg>
              Performans Karşılaştırma Grafiği (Geçmiş Testler)
            </h2>
            {runHistory.length > 0 && (
              <button onClick={clearHistory} className="btn-monitor-click" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                Geçmişi Temizle
              </button>
            )}
          </div>

          {runHistory.length > 0 ? (
            <div className="comparison-section">
              {runHistory.map((run) => {
                const speedup = getSpeedup(run);
                const isFastest = run.duration === fastestDuration;
                const isSlowest = run.duration === slowestDuration && runHistory.length > 1;
                
                // Calculate percentage relative to slowest run for visual width mapping
                const widthPct = (slowestDuration > 0) ? (run.duration / slowestDuration) * 100 : 100;
                
                let fillClass = '';
                if (isFastest) fillClass = 'fastest';
                else if (isSlowest) fillClass = 'slowest';

                return (
                  <div key={run.id} className="history-card">
                    <div className="history-item-row">
                      <div className="history-label-group">
                        <div className="history-mode-title">{run.mode}</div>
                        <div className="history-mode-subtitle">
                          Arama Sınırı: {formatNumber(run.rangeLimit)}
                        </div>
                      </div>

                      <div className="history-bar-track">
                        <div
                          className={`history-bar-fill ${fillClass}`}
                          style={{ width: `${widthPct}%` }}
                        />
                        <span className="history-duration-text">
                          {formatTime(run.duration)}
                        </span>
                      </div>

                      <div>
                        {speedup ? (
                          <div className="history-speedup-badge">
                            %{Math.round(parseFloat(speedup) * 100)} Hızlı ({speedup}x)
                          </div>
                        ) : (
                          <div className="history-speedup-badge slowest">
                            Referans (1x)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-chart-msg">
              Karşılaştırma yapabilmek için farklı thread sayılarıyla (örneğin 1 Thread ve 4 Thread) testler gerçekleştirin. Yük paylaşımının süreyi nasıl kısalttığını barlarla kıyaslayın!
            </div>
          )}
        </section>
      </div>


    </div>
  );
}

export default App;
