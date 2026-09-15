import React, { useState, useRef, useEffect } from 'react';
import { PhoneFrame } from './components/PhoneFrame';
import { RecordScreen } from './components/RecordScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { ReferralReportModal } from './components/ReferralReportModal';
import { HistoryScreen, HistoryItem } from './components/HistoryScreen';
import { CommandCenterDashboard } from './components/CommandCenterDashboard';
import { AUSCULTATION_POINTS, AuscultationPoint } from './components/AnatomicalChestSelector';
import { PatientRecord, DEMO_PATIENTS } from './components/PatientSection';
import { ButterworthBandpass4thOrder, applyAdaptiveNoiseSuppression } from './dsp/butterworth';
import { computeMelSpectrogram, SpectrogramResult, getBioColor } from './dsp/melSpectrogram';
import { computeXAIExplanation, XAIExplanation } from './dsp/xaiHeatmap';
import { runInference, ClassificationResult } from './ml/onnxInference';
import { PRESETS, synthesizePresetAudio } from './utils/audioPresets';

import { LanguageCode } from './utils/i18n';

export function App() {
  const [viewMode, setViewMode] = useState<'command_center' | 'mobile'>('command_center');
  const [activeTab, setActiveTab] = useState<'record' | 'processing' | 'results' | 'history'>('record');

  // Theme & Language State with LocalStorage Persistence
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('secondear_theme') as 'dark' | 'light') || 'dark'
  );
  const [lang, setLang] = useState<LanguageCode>(
    () => (localStorage.getItem('secondear_lang') as LanguageCode) || 'en'
  );

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.body.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.body.classList.remove('light');
    }
    localStorage.setItem('secondear_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSelectLanguage = (newLang: LanguageCode) => {
    setLang(newLang);
    localStorage.setItem('secondear_lang', newLang);
  };

  // Patient Demographic & Clinical Vitals State
  const [patient, setPatient] = useState<PatientRecord>(DEMO_PATIENTS[0]);

  const handleUpdatePatient = (updated: Partial<PatientRecord>) => {
    setPatient((prev) => {
      const next = { ...prev, ...updated };
      if (spectrogramResult) {
        runInference(spectrogramResult, next).then((mlRes) => {
          setClassificationResult(mlRes);
        });
      }
      return next;
    });
  };

  // Audio state
  const [currentAudio, setCurrentAudio] = useState<Float32Array | null>(null);
  const [currentLabel, setCurrentLabel] = useState<string>('Expiratory Wheeze (Asthma / COPD)');
  const [selectedPointId, setSelectedPointId] = useState<string>('axillary');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('wheeze');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // DSP Studio State
  const [isFilterEnabled, setIsFilterEnabled] = useState(true);
  const [isNoiseInjected, setIsNoiseInjected] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0.25);
  const [sensorMode, setSensorMode] = useState<'mic_coupler' | 'phone_mic' | 'digital_stethoscope'>('mic_coupler');

  // ML / XAI Results
  const [isProcessing, setIsProcessing] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [spectrogramResult, setSpectrogramResult] = useState<SpectrogramResult | null>(null);
  const [xaiResult, setXaiResult] = useState<XAIExplanation | null>(null);
  const [showXAI, setShowXAI] = useState(true);

  // UI state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [canvasDataUrl, setCanvasDataUrl] = useState<string>('');

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);
  const playbackStartTimeRef = useRef<number>(0);

  // Initialize with Wheeze preset on launch
  useEffect(() => {
    loadPresetAudio('wheeze');
  }, []);

  // Ensure AudioContext
  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx({ sampleRate: 16000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Load preset audio and immediately execute live edge screening
  const loadPresetAudio = async (presetId: string, customPatient?: PatientRecord) => {
    stopPlayback();
    setSelectedPresetId(presetId);
    const p = PRESETS.find((item) => item.id === presetId);
    if (p) {
      setCurrentLabel(p.name);
    }
    let baseAudio = synthesizePresetAudio(presetId, 16000, 4.0);

    // Apply simulated noise if active
    if (isNoiseInjected) {
      const noisy = new Float32Array(baseAudio.length);
      for (let i = 0; i < baseAudio.length; i++) {
        const n = (Math.random() * 2 - 1) * noiseLevel;
        noisy[i] = baseAudio[i] * (1 - noiseLevel * 0.5) + n;
      }
      baseAudio = noisy;
    }

    // Apply Butterworth DSP filter if enabled
    let conditioned = baseAudio;
    if (isFilterEnabled) {
      const bpf = new ButterworthBandpass4thOrder(16000, 50, 2000);
      conditioned = bpf.process(baseAudio);
      conditioned = applyAdaptiveNoiseSuppression(conditioned);
    }

    setCurrentAudio(conditioned);
    drawWaveform(conditioned);

    // Auto-compute spectrogram preview
    const spec = computeMelSpectrogram(conditioned, 16000, 128, 512, 160, 400);
    setSpectrogramResult(spec);

    // Auto-run AI Inference & XAI explanation so Screening Diagnosis updates on every change
    const activePatient = customPatient || patient;
    const mlRes = await runInference(spec, activePatient);
    setClassificationResult(mlRes);

    const xai = computeXAIExplanation(spec, mlRes.predictedClass, mlRes.classProbabilities);
    setXaiResult(xai);

    // Auto-record session into history
    const historyEntry: HistoryItem = {
      id: `screen-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      result: mlRes,
      spec,
      xai,
      audioData: conditioned,
      sourceLabel: p?.name || 'Preset Sound',
      auscultationSite: AUSCULTATION_POINTS.find((point) => point.presetId === presetId)?.name || 'Anterior Lung',
      patient: { ...activePatient },
    };
    setHistory((prev) => [
      historyEntry,
      ...prev.filter((h) => h.sourceLabel !== historyEntry.sourceLabel).slice(0, 19),
    ]);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setCurrentAudio(item.audioData);
    setCurrentLabel(item.sourceLabel);
    setClassificationResult(item.result);
    setSpectrogramResult(item.spec);
    setXaiResult(item.xai);
    if (item.patient) setPatient(item.patient);
    const point = AUSCULTATION_POINTS.find((p) => p.name === item.auscultationSite);
    if (point) setSelectedPointId(point.id);
  };

  // Handle Anatomical Point Selection
  const handleSelectPoint = (point: AuscultationPoint) => {
    setSelectedPointId(point.id);
    setCurrentLabel(point.name);
    loadPresetAudio(point.presetId);
  };

  // Draw Waveform on Canvas
  const drawWaveform = (audio: Float32Array) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw cyber grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Zero-line
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform line
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = Math.ceil(audio.length / width);
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = audio[i * step + j] || 0;
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.lineTo(i, (1 + min) * (height / 2));
      ctx.lineTo(i, (1 + max) * (height / 2));
    }
    ctx.stroke();
  };

  // Render 128 Mel-Spectrogram & XAI Heatmap on Canvas
  useEffect(() => {
    if (!spectrogramResult) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const { melMatrix, nFrames, nMelBins, minVal, maxVal } = spectrogramResult;

    ctx.clearRect(0, 0, width, height);

    const colWidth = width / nFrames;
    const rowHeight = height / nMelBins;
    const valRange = maxVal - minVal > 0 ? maxVal - minVal : 1;

    for (let t = 0; t < nFrames; t++) {
      for (let m = 0; m < nMelBins; m++) {
        const rawVal = melMatrix[m][t];
        const normVal = (rawVal - minVal) / valRange;
        const [r, g, b] = getBioColor(normVal);

        const x = t * colWidth;
        const y = height - (m + 1) * rowHeight;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(colWidth), Math.ceil(rowHeight));
      }
    }

    // Overlay XAI Attention Saliency Map
    if (showXAI && xaiResult && xaiResult.attentionMap.length > 0) {
      for (let t = 0; t < nFrames; t++) {
        for (let m = 0; m < nMelBins; m++) {
          const sal = xaiResult.attentionMap[m][t];
          if (sal > 0.35) {
            const x = t * colWidth;
            const y = height - (m + 1) * rowHeight;
            ctx.fillStyle = `rgba(239, 68, 68, ${sal * 0.45})`;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(colWidth), Math.ceil(rowHeight));
          }
        }
      }

      // Draw Anomaly Bounding Boxes
      xaiResult.boundingBoxes.forEach((box) => {
        const duration = 4.0;
        const boxX = (box.tStart / duration) * width;
        const boxW = ((box.tEnd - box.tStart) / duration) * width;
        const fMinRatio = Math.max(0, Math.min(1, (box.fMin - 50) / 1950));
        const fMaxRatio = Math.max(0, Math.min(1, (box.fMax - 50) / 1950));
        const boxY = height - fMaxRatio * height;
        const boxH = (fMaxRatio - fMinRatio) * height;

        ctx.save();
        ctx.strokeStyle = box.color || '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Tag
        ctx.fillStyle = box.color || '#ef4444';
        ctx.fillRect(boxX, boxY - 18, Math.max(90, boxW), 18);
        ctx.fillStyle = '#060a17';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillText(`⚡ ${box.label} (${xaiResult.primaryTimeWindow})`, boxX + 4, boxY - 5);
        ctx.restore();
      });
    }

    // Grid Axes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('2000 Hz', 6, 14);
    ctx.fillText('500 Hz', 6, height * 0.5);
    ctx.fillText('50 Hz', 6, height - 6);

    ctx.fillText('0.0s', 6, height - 6);
    ctx.fillText('2.0s', width * 0.48, height - 6);
    ctx.fillText('4.0s', width - 32, height - 6);

    // Audio Playback Scrubber Line
    if (isPlaying || playbackProgress > 0) {
      const scrubX = playbackProgress * width;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(scrubX, 0);
      ctx.lineTo(scrubX, height);
      ctx.stroke();

      ctx.fillStyle = '#00f5d4';
      ctx.beginPath();
      ctx.arc(scrubX, 8, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    setCanvasDataUrl(canvas.toDataURL('image/png'));
  }, [spectrogramResult, xaiResult, showXAI, isPlaying, playbackProgress]);

  // Audio Recording
  const startRecording = async () => {
    stopPlayback();
    const ctx = ensureAudioContext();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 16000 },
      });

      mediaStreamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const processor = ctx.createScriptProcessor(4096, 1, 1);
      recordedChunksRef.current = [];

      processor.onaudioprocess = (e) => {
        if (!isRecording) return;
        recordedChunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      setIsRecording(true);
      setRecordingSeconds(0);

      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingSeconds(Number(elapsed.toFixed(1)));
        if (elapsed >= 4.0) stopRecording();
      }, 100);

      // Live waveform loop
      const drawLive = () => {
        if (!analyserRef.current || !waveformCanvasRef.current) return;
        const canvas = waveformCanvasRef.current;
        const cCtx = canvas.getContext('2d');
        if (!cCtx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArray);

        cCtx.fillStyle = 'rgba(4, 8, 23, 0.3)';
        cCtx.fillRect(0, 0, canvas.width, canvas.height);

        cCtx.lineWidth = 2.5;
        cCtx.strokeStyle = '#ef4444';
        cCtx.beginPath();

        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) cCtx.moveTo(x, y);
          else cCtx.lineTo(x, y);
          x += sliceWidth;
        }
        cCtx.lineTo(canvas.width, canvas.height / 2);
        cCtx.stroke();

        animFrameRef.current = requestAnimationFrame(drawLive);
      };
      drawLive();
    } catch (err) {
      alert('Microphone access denied or unavailable. Clinical presets are loaded for instant testing!');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    if (recordedChunksRef.current.length > 0) {
      let totalLen = 0;
      for (const chunk of recordedChunksRef.current) totalLen += chunk.length;
      const combined = new Float32Array(totalLen);
      let offset = 0;
      for (const chunk of recordedChunksRef.current) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      const targetLen = 16000 * 4;
      const trimmed = combined.length >= targetLen ? combined.slice(0, targetLen) : combined;
      
      let conditioned = trimmed;
      if (isFilterEnabled) {
        const bpf = new ButterworthBandpass4thOrder(16000, 50, 2000);
        conditioned = bpf.process(trimmed);
        conditioned = applyAdaptiveNoiseSuppression(conditioned);
      }

      setCurrentAudio(conditioned);
      setCurrentLabel('Live Auscultation Recording');
      drawWaveform(conditioned);

      const spec = computeMelSpectrogram(conditioned, 16000, 128, 512, 160, 400);
      setSpectrogramResult(spec);

      runInference(spec, patient).then((mlRes) => {
        setClassificationResult(mlRes);
        const xai = computeXAIExplanation(spec, mlRes.predictedClass, mlRes.classProbabilities);
        setXaiResult(xai);
      });
    }
  };

  // Playback Toggle
  const togglePlayback = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (!currentAudio) return;
    const ctx = ensureAudioContext();
    const buffer = ctx.createBuffer(1, currentAudio.length, 16000);
    buffer.copyToChannel(currentAudio as Float32Array<ArrayBuffer>, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    source.onended = () => {
      setIsPlaying(false);
      setPlaybackProgress(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };

    source.start(0);
    sourceNodeRef.current = source;
    playbackStartTimeRef.current = ctx.currentTime;
    setIsPlaying(true);

    const updateProgress = () => {
      if (!ctx || !sourceNodeRef.current) return;
      const elapsed = ctx.currentTime - playbackStartTimeRef.current;
      const progress = Math.min(1, elapsed / 4.0);
      setPlaybackProgress(progress);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignored
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  };

  const runScreeningPipeline = async () => {
    if (!currentAudio) return;
    setIsProcessing(true);

    // 1. DSP Preprocessing
    let audioToProcess = currentAudio;
    if (isFilterEnabled) {
      const bpf = new ButterworthBandpass4thOrder(16000, 50, 2000);
      audioToProcess = bpf.process(currentAudio);
      audioToProcess = applyAdaptiveNoiseSuppression(audioToProcess);
    }

    // 2. 128 Mel-spectrogram
    const spec = computeMelSpectrogram(audioToProcess, 16000, 128, 512, 160, 400);
    setSpectrogramResult(spec);

    // 3. Inference
    const mlRes = await runInference(spec);
    setClassificationResult(mlRes);

    // 4. XAI Heatmap
    const xai = computeXAIExplanation(spec, mlRes.predictedClass, mlRes.classProbabilities);
    setXaiResult(xai);

    // 5. History
    const historyEntry: HistoryItem = {
      id: `screen-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      result: mlRes,
      spec,
      xai,
      audioData: currentAudio,
      sourceLabel: currentLabel,
      auscultationSite: AUSCULTATION_POINTS.find((p) => p.id === selectedPointId)?.name || 'Anterior Chest',
      patient: { ...patient },
    };
    setHistory((prev) => [historyEntry, ...prev.slice(0, 19)]);
    setIsProcessing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const arrayBuffer = ev.target?.result as ArrayBuffer;
      if (!arrayBuffer) return;

      const ctx = ensureAudioContext();
      try {
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        const rawPcm = decoded.getChannelData(0);
        const targetLen = 16000 * 4;
        const normalized = new Float32Array(targetLen);
        for (let i = 0; i < targetLen; i++) {
          normalized[i] = i < rawPcm.length ? rawPcm[i] : 0;
        }
        let conditioned = normalized;
        if (isFilterEnabled) {
          const bpf = new ButterworthBandpass4thOrder(16000, 50, 2000);
          conditioned = bpf.process(normalized);
          conditioned = applyAdaptiveNoiseSuppression(conditioned);
        }

        setCurrentAudio(conditioned);
        setCurrentLabel(file.name);
        drawWaveform(conditioned);
        const spec = computeMelSpectrogram(conditioned, 16000, 128, 512, 160, 400);
        setSpectrogramResult(spec);
        
        const mlRes = await runInference(spec, patient);
        setClassificationResult(mlRes);
        const xai = computeXAIExplanation(spec, mlRes.predictedClass, mlRes.classProbabilities);
        setXaiResult(xai);
      } catch (err) {
        alert('Invalid WAV audio file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="cyber-bg min-h-screen text-slate-100 flex flex-col justify-between py-2 sm:py-4 selection:bg-cyan-400 selection:text-black">
      {viewMode === 'command_center' ? (
        <CommandCenterDashboard
          theme={theme}
          onToggleTheme={handleToggleTheme}
          lang={lang}
          onSelectLanguage={handleSelectLanguage}
          history={history}
          onSelectHistoryItem={handleSelectHistoryItem}
          onClearHistory={() => setHistory([])}
          patient={patient}
          onUpdatePatient={handleUpdatePatient}
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          currentAudio={currentAudio}
          currentLabel={currentLabel}
          selectedPointId={selectedPointId}
          onSelectPoint={handleSelectPoint}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onSelectPreset={(pId) => {
            const point = AUSCULTATION_POINTS.find((p) => p.presetId === pId);
            if (point) setSelectedPointId(point.id);
            loadPresetAudio(pId);
          }}
          selectedPresetId={selectedPresetId}
          onFileUpload={handleFileUpload}
          isPlaying={isPlaying}
          playbackProgress={playbackProgress}
          onTogglePlayback={togglePlayback}
          isFilterEnabled={isFilterEnabled}
          onToggleFilter={(en) => {
            setIsFilterEnabled(en);
            if (selectedPresetId) loadPresetAudio(selectedPresetId);
          }}
          isNoiseInjected={isNoiseInjected}
          onToggleNoise={(en) => {
            setIsNoiseInjected(en);
            if (selectedPresetId) loadPresetAudio(selectedPresetId);
          }}
          noiseLevel={noiseLevel}
          onChangeNoiseLevel={setNoiseLevel}
          sensorMode={sensorMode}
          onChangeSensorMode={setSensorMode}
          onRunScreening={runScreeningPipeline}
          isProcessing={isProcessing}
          result={classificationResult}
          spec={spectrogramResult}
          xai={xaiResult}
          showXAI={showXAI}
          onToggleXAI={() => setShowXAI(!showXAI)}
          canvasRef={canvasRef}
          waveformCanvasRef={waveformCanvasRef}
          onOpenReferralModal={() => setShowReferralModal(true)}
          onRetake={() => {
            setClassificationResult(null);
            setXaiResult(null);
          }}
          isMobileView={false}
          onToggleViewMode={() => setViewMode('mobile')}
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-2">
          {/* Switch to Fullscreen Dashboard Button */}
          <button
            onClick={() => setViewMode('command_center')}
            className="mb-3 px-4 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-semibold shadow-lg transition cursor-pointer"
          >
            🖥️ Switch to Fullscreen Command Center
          </button>

          <PhoneFrame
            activeTab={activeTab}
            onTabChange={(tab) => {
              if (tab !== 'processing') setActiveTab(tab);
            }}
            hasResults={classificationResult !== null}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            lang={lang}
            onSelectLanguage={handleSelectLanguage}
          >
            {activeTab === 'record' && (
              <RecordScreen
                patient={patient}
                onUpdatePatient={handleUpdatePatient}
                lang={lang}
                onAudioReady={async (audio, lbl, site) => {
                  setCurrentAudio(audio);
                  setCurrentLabel(lbl);
                  setActiveTab('processing');

                  const bpf = new ButterworthBandpass4thOrder(16000, 50, 2000);
                  const filtered = bpf.process(audio);
                  const conditioned = applyAdaptiveNoiseSuppression(filtered);
                  const spec = computeMelSpectrogram(conditioned, 16000, 128, 512, 160, 400);
                  setSpectrogramResult(spec);

                  const mlRes = await runInference(spec);
                  setClassificationResult(mlRes);

                  const xai = computeXAIExplanation(spec, mlRes.predictedClass, mlRes.classProbabilities);
                  setXaiResult(xai);

                  const historyEntry: HistoryItem = {
                    id: `screen-${Date.now()}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    result: mlRes,
                    spec,
                    xai,
                    audioData: audio,
                    sourceLabel: lbl,
                    auscultationSite: site,
                    patient: { ...patient },
                  };
                  setHistory((prev) => [historyEntry, ...prev.slice(0, 19)]);
                }}
              />
            )}

            {activeTab === 'processing' && (
              <ProcessingScreen onComplete={() => setActiveTab('results')} lang={lang} />
            )}

            {activeTab === 'results' && classificationResult && spectrogramResult && xaiResult && currentAudio && (
              <ResultsScreen
                result={classificationResult}
                spec={spectrogramResult}
                xai={xaiResult}
                audioData={currentAudio}
                sourceLabel={currentLabel}
                auscultationSite={AUSCULTATION_POINTS.find((p) => p.id === selectedPointId)?.name || 'Anterior Lung'}
                patient={patient}
                lang={lang}
                onOpenReferralModal={() => setShowReferralModal(true)}
                onRetake={() => setActiveTab('record')}
                onCanvasUpdate={(url) => setCanvasDataUrl(url)}
              />
            )}

            {activeTab === 'history' && (
              <HistoryScreen
                history={history}
                lang={lang}
                onSelectHistoryItem={(item) => {
                  setCurrentAudio(item.audioData);
                  setCurrentLabel(item.sourceLabel);
                  setClassificationResult(item.result);
                  setSpectrogramResult(item.spec);
                  setXaiResult(item.xai);
                  if (item.patient) setPatient(item.patient);
                  setActiveTab('results');
                }}
                onClearHistory={() => setHistory([])}
                onBackToRecord={() => setActiveTab('record')}
              />
            )}
          </PhoneFrame>
        </div>
      )}

      {/* 1-Click Referral Slip Modal */}
      {showReferralModal && classificationResult && xaiResult && (
        <ReferralReportModal
          result={classificationResult}
          xai={xaiResult}
          auscultationSite={AUSCULTATION_POINTS.find((p) => p.id === selectedPointId)?.name || 'Bilateral Lower Lung Bases'}
          sourceLabel={currentLabel}
          spectrogramCanvasDataUrl={canvasDataUrl}
          patient={patient}
          onUpdatePatient={handleUpdatePatient}
          onClose={() => setShowReferralModal(false)}
          lang={lang}
        />
      )}
    </div>
  );
}

export default App;
