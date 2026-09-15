import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Upload, Sparkles, HeartPulse, Wind, Stethoscope, CheckCircle2 } from 'lucide-react';
import { PRESETS, AudioPresetInfo, synthesizePresetAudio } from '../utils/audioPresets';
import { PatientSection, PatientRecord } from './PatientSection';
import { LanguageCode, getTranslation } from '../utils/i18n';

interface RecordScreenProps {
  patient: PatientRecord;
  onUpdatePatient: (updated: Partial<PatientRecord>) => void;
  onAudioReady: (audioData: Float32Array, sourceLabel: string, site: string) => void;
  lang?: LanguageCode;
}

export const RecordScreen: React.FC<RecordScreenProps> = ({ patient, onUpdatePatient, onAudioReady, lang = 'en' }) => {
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedSite, setSelectedSite] = useState('Bilateral Lower Lung (Posterior)');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('wheeze');
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<Float32Array | null>(null);
  const [currentLabel, setCurrentLabel] = useState<string>('Expiratory Wheeze Preset');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Float32Array[]>([]);

  // Initialize with preset sample on load
  useEffect(() => {
    loadPreset('wheeze');
    return () => {
      stopPlayback();
      stopRecording();
    };
  }, []);

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

  const loadPreset = (presetId: string) => {
    stopPlayback();
    setSelectedPresetId(presetId);
    const p = PRESETS.find((item) => item.id === presetId);
    if (!p) return;

    setSelectedSite(p.auscultationPoint);
    const audio = synthesizePresetAudio(presetId, 16000, 4.0);
    setCurrentAudio(audio);
    setCurrentLabel(p.name);
    drawWaveformPreview(audio);
  };

  const drawWaveformPreview = (audio: Float32Array) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
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

    // Center line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform line
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const step = Math.ceil(audio.length / width);
    const amp = height * 0.45;
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

  const startRecording = async () => {
    stopPlayback();
    const ctx = ensureAudioContext();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000,
        },
      });

      mediaStreamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Use ScriptProcessor / AudioWorklet to capture raw PCM
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      recordedChunksRef.current = [];

      processor.onaudioprocess = (e) => {
        if (!isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);
        recordedChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      setIsRecording(true);
      setRecordingSeconds(0);

      // Countdown 4 seconds
      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setRecordingSeconds(Number(elapsed.toFixed(1)));
        if (elapsed >= 4.0) {
          stopRecording();
        }
      }, 100);

      // Animate real-time mic waveform
      const drawLive = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const cCtx = canvas.getContext('2d');
        if (!cCtx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArray);

        cCtx.fillStyle = 'rgba(6, 10, 23, 0.3)';
        cCtx.fillRect(0, 0, canvas.width, canvas.height);

        cCtx.lineWidth = 2.5;
        cCtx.strokeStyle = '#ef4444'; // Red recording line
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

        animFrameIdRef.current = requestAnimationFrame(drawLive);
      };

      drawLive();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access unavailable or denied. You can select clinical presets below for instant testing!');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Assemble recorded chunks
    if (recordedChunksRef.current.length > 0) {
      let totalLen = 0;
      for (const chunk of recordedChunksRef.current) totalLen += chunk.length;
      const combined = new Float32Array(totalLen);
      let offset = 0;
      for (const chunk of recordedChunksRef.current) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      // Slice to 4 seconds (64,000 samples)
      const targetLen = 16000 * 4;
      const trimmed = combined.length >= targetLen ? combined.slice(0, targetLen) : combined;
      setCurrentAudio(trimmed);
      setCurrentLabel('Live Stethoscope Recording');
      drawWaveformPreview(trimmed);
    }
  };

  const togglePlayback = () => {
    if (isPlayingPreview) {
      stopPlayback();
      return;
    }
    if (!currentAudio) return;

    const ctx = ensureAudioContext();
    stopPlayback();

    const buffer = ctx.createBuffer(1, currentAudio.length, 16000);
    buffer.copyToChannel(currentAudio, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => setIsPlayingPreview(false);
    source.start();

    sourceNodeRef.current = source;
    setIsPlayingPreview(true);
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
    setIsPlayingPreview(false);
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
        // Resample/slice to 4.0s
        const targetLen = 16000 * 4;
        const normalized = new Float32Array(targetLen);
        for (let i = 0; i < targetLen; i++) {
          normalized[i] = i < rawPcm.length ? rawPcm[i] : 0;
        }
        setCurrentAudio(normalized);
        setCurrentLabel(file.name);
        drawWaveformPreview(normalized);
      } catch (err) {
        alert('Invalid WAV audio file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProceedToScreening = () => {
    if (!currentAudio) {
      alert('Please record or select an audio sample first.');
      return;
    }
    stopPlayback();
    onAudioReady(currentAudio, currentLabel, selectedSite);
  };

  return (
    <div className="flex flex-col gap-3 pb-2 animate-fadeIn">
      {/* Patient Intake Section */}
      <PatientSection
        patient={patient}
        onUpdatePatient={onUpdatePatient}
        isCompact={true}
        lang={lang}
      />
      {/* Anatomical Auscultation Site Selector */}
      <div className="bg-navy-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
          {t('chestPosition', 'Auscultation Site / Chest Position:')}
        </label>
        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="w-full bg-navy-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-cyan-300 font-medium focus:outline-none focus:border-cyan-400"
        >
          <option value="Bilateral Lower Lung (Posterior)">{t('site_posterior_base', 'Posterior Lower Lung Bases (LLL / RLL)')}</option>
          <option value="Right Anterior Lower Lobe (RAL)">{t('site_anterior_right', 'Right Anterior Lower Lobe (RAL)')}</option>
          <option value="Bilateral Mid-Axillary Lines">{t('site_axillary', 'Bilateral Mid-Axillary Lines (Wheeze Focus)')}</option>
          <option value="Anterior Trachea / Subglottic Space">{t('site_trachea', 'Anterior Trachea (Stridor / Croup)')}</option>
          <option value="2nd Right Intercostal Space (Aortic Area)">{t('site_aortic', '2nd Right ICS (Aortic Cardiac Valve)')}</option>
          <option value="5th Left ICS Mid-Clavicular (Mitral Apex)">{t('site_mitral', '5th Left ICS Apex (Mitral Cardiac Valve)')}</option>
        </select>
      </div>

      {/* Real-time Waveform Canvas Display */}
      <div className="bg-navy-950 border border-slate-800 rounded-2xl p-3 shadow-inner relative overflow-hidden">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5">
          <span className="flex items-center gap-1 text-slate-200">
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-cyan-400'}`}></span>
            {isRecording ? `${t('recordingStatus', 'RECORDING')}: ${recordingSeconds.toFixed(1)}s / 4.0s` : currentLabel}
          </span>
          <span className="text-[10px] text-cyan-400 font-bold">{t('samplingRate', '16 kHz • 16-bit PCM')}</span>
        </div>

        <canvas
          ref={canvasRef}
          width={380}
          height={110}
          className="w-full h-28 bg-navy-900/60 rounded-xl border border-slate-800/80"
        />

        {/* Audio Playback Toolbar */}
        {currentAudio && !isRecording && (
          <div className="mt-2.5 flex items-center justify-between">
            <button
              onClick={togglePlayback}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition border border-slate-700 cursor-pointer"
            >
              {isPlayingPreview ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-cyan-400" /> {t('stopAudio', 'Stop Audio')}
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-cyan-400" /> {t('playAudio', 'Listen Audio (4s)')}
                </>
              )}
            </button>

            <label className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('uploadWav', 'Upload WAV')}</span>
              <input type="file" accept=".wav,audio/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}
      </div>

      {/* Main Record Action Button */}
      <div className="flex flex-col items-center justify-center py-2">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl cursor-pointer ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse shadow-glow-urgent scale-105 ring-4 ring-red-500/30'
              : 'bg-gradient-to-tr from-cyan-500 to-sky-400 text-navy-950 hover:brightness-110 shadow-glow-cyan hover:scale-105'
          }`}
          aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          {isRecording ? (
            <Square className="w-8 h-8 fill-current" />
          ) : (
            <Mic className="w-9 h-9 stroke-[2.5]" />
          )}
        </button>
        <span className="text-[11px] font-medium text-slate-400 mt-2">
          {isRecording ? t('tapToStop', 'Tap to Stop Recording') : t('tapToRecord', 'Tap to Record Stethoscope / Phone Mic')}
        </span>
      </div>

      {/* Clinical Presets Selection (1-Click Evaluation) */}
      <div className="bg-navy-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            {t('clinicalPresetsTitle', 'Clinical Benchmark Presets (1-Click Test):')}
          </span>
          <span className="text-[9px] font-mono text-cyan-400">ICBHI / PhysioNet</span>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {PRESETS.map((p) => {
            const isSelected = selectedPresetId === p.id && !isRecording;
            return (
              <button
                key={p.id}
                onClick={() => loadPreset(p.id)}
                className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-400/60 shadow-glow-cyan/20'
                    : 'bg-navy-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      p.category === 'heart'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    {p.category === 'heart' ? (
                      <HeartPulse className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Wind className="w-4 h-4 text-sky-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                      {p.name}
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight truncate max-w-[240px]">
                      {p.description}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${
                    p.expectedTriage === 'urgent'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : p.expectedTriage === 'moderate'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {p.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Call-to-Action: Run Screening */}
      <button
        onClick={handleProceedToScreening}
        disabled={isRecording}
        className="w-full py-3.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 text-navy-950 font-black text-sm rounded-2xl shadow-glow-cyan hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 tracking-wide cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-navy-950 stroke-[3]" />
        {t('runAIAction', 'RUN ON-DEVICE AI SCREENING')}
      </button>
    </div>
  );
};
