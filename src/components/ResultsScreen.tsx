import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FileText,
  Sparkles,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Layers,
  User,
  AlertCircle
} from 'lucide-react';
import { ClassificationResult } from '../ml/onnxInference';
import { SpectrogramResult, getBioColor } from '../dsp/melSpectrogram';
import { XAIExplanation } from '../dsp/xaiHeatmap';
import { PatientRecord } from './PatientSection';
import { LanguageCode, getTranslation } from '../utils/i18n';

interface ResultsScreenProps {
  result: ClassificationResult;
  spec: SpectrogramResult;
  xai: XAIExplanation;
  audioData: Float32Array;
  sourceLabel: string;
  auscultationSite: string;
  patient?: PatientRecord;
  onOpenReferralModal: () => void;
  onRetake: () => void;
  onCanvasUpdate?: (dataUrl: string) => void;
  lang?: LanguageCode;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  result,
  spec,
  xai,
  audioData,
  sourceLabel,
  auscultationSite,
  patient,
  onOpenReferralModal,
  onRetake,
  onCanvasUpdate,
  lang = 'en',
}) => {
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);
  const [showXAI, setShowXAI] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 1

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);

  // Render Mel-Spectrogram & XAI Heatmap on Mount or toggle
  useEffect(() => {
    renderSpectrogramCanvas();
    if (onCanvasUpdate && canvasRef.current) {
      onCanvasUpdate(canvasRef.current.toDataURL('image/png'));
    }
  }, [spec, xai, showXAI, playbackProgress]);

  const renderSpectrogramCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const { melMatrix, nFrames, nMelBins, minVal, maxVal } = spec;

    ctx.clearRect(0, 0, width, height);

    // Render 128 Mel bins (Bottom = 50Hz, Top = 2000Hz)
    const colWidth = width / nFrames;
    const rowHeight = height / nMelBins;
    const valRange = maxVal - minVal > 0 ? maxVal - minVal : 1;

    for (let t = 0; t < nFrames; t++) {
      for (let m = 0; m < nMelBins; m++) {
        const rawVal = melMatrix[m][t];
        const normVal = (rawVal - minVal) / valRange;
        const [r, g, b] = getBioColor(normVal);

        // Mel bin 0 (50Hz) at bottom, Mel bin 127 (2000Hz) at top
        const x = t * colWidth;
        const y = height - (m + 1) * rowHeight;

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(colWidth), Math.ceil(rowHeight));
      }
    }

    // Overlay XAI Attention Heatmap & Bounding Boxes
    if (showXAI && xai.attentionMap.length > 0) {
      for (let t = 0; t < nFrames; t++) {
        for (let m = 0; m < nMelBins; m++) {
          const sal = xai.attentionMap[m][t];
          if (sal > 0.35) {
            const x = t * colWidth;
            const y = height - (m + 1) * rowHeight;
            // Glowing overlay
            ctx.fillStyle = `rgba(239, 68, 68, ${sal * 0.45})`;
            ctx.fillRect(Math.floor(x), Math.floor(y), Math.ceil(colWidth), Math.ceil(rowHeight));
          }
        }
      }

      // Draw Anomaly Bounding Boxes
      xai.boundingBoxes.forEach((box) => {
        const duration = 4.0;
        const boxX = (box.tStart / duration) * width;
        const boxW = ((box.tEnd - box.tStart) / duration) * width;

        // Freq to Mel coordinates approx
        const fMinRatio = Math.max(0, Math.min(1, (box.fMin - 50) / 1950));
        const fMaxRatio = Math.max(0, Math.min(1, (box.fMax - 50) / 1950));
        const boxY = height - fMaxRatio * height;
        const boxH = (fMaxRatio - fMinRatio) * height;

        // Pulsing border
        ctx.save();
        ctx.strokeStyle = box.color || '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        // Glow fill
        ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Tag label
        ctx.fillStyle = box.color || '#ef4444';
        ctx.fillRect(boxX, boxY - 16, Math.max(80, boxW), 16);
        ctx.fillStyle = '#060a17';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText(`⚡ ${box.label} (${xai.primaryTimeWindow})`, boxX + 4, boxY - 4);
        ctx.restore();
      });
    }

    // Draw Frequency & Time Axis Overlays
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('2000 Hz', 6, 12);
    ctx.fillText('500 Hz', 6, height * 0.5);
    ctx.fillText('50 Hz', 6, height - 6);

    ctx.fillText('0.0s', 6, height - 6);
    ctx.fillText('2.0s', width * 0.48, height - 6);
    ctx.fillText('4.0s', width - 28, height - 6);

    // Audio Playback Scrubber Line
    if (isPlaying || playbackProgress > 0) {
      const scrubX = playbackProgress * width;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(scrubX, 0);
      ctx.lineTo(scrubX, height);
      ctx.stroke();

      // Scrubber head
      ctx.fillStyle = '#00f5d4';
      ctx.beginPath();
      ctx.arc(scrubX, 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const toggleAudioPlayback = () => {
    if (isPlaying) {
      stopAudioPlayback();
      return;
    }

    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx({ sampleRate: 16000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const ctx = audioContextRef.current;
    const buffer = ctx.createBuffer(1, audioData.length, 16000);
    buffer.copyToChannel(audioData as Float32Array<ArrayBuffer>, 0);

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

    const updateScrubber = () => {
      if (!ctx || !sourceNodeRef.current) return;
      const elapsed = ctx.currentTime - playbackStartTimeRef.current;
      const progress = Math.min(1, elapsed / 4.0);
      setPlaybackProgress(progress);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(updateScrubber);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateScrubber);
  };

  const stopAudioPlayback = () => {
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

  // Vitals check
  const numericSpo2 = patient ? parseInt(patient.spo2.replace(/[^0-9]/g, ''), 10) || 98 : 98;
  const isHypoxic = numericSpo2 < 92;

  return (
    <div className="flex flex-col gap-3 pb-2 animate-fadeIn">
      {/* Patient Summary Card */}
      {patient && (
        <div className="glass-card rounded-2xl p-3 border border-cyan-500/20 bg-navy-900/80 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{patient.patientName || t('anonymousPatient', 'Anonymous Patient')}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-cyan-400/10 text-cyan-300 rounded border border-cyan-400/30">
                    {patient.patientId}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {patient.age} • {patient.gender} • {patient.clinicName}
                </div>
              </div>
            </div>

            {isHypoxic && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center gap-1 font-bold animate-pulse">
                <AlertCircle className="w-3 h-3" /> {t('hypoxiaAlert', 'Hypoxia')} ({patient.spo2})
              </span>
            )}
          </div>

          {/* Vitals Telemetry Row */}
          <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px] bg-navy-950/90 rounded-xl p-1.5 border border-slate-800">
            <div>
              <span className="text-[8px] text-slate-400 block font-sans">{t('spo2', 'SpO2')}</span>
              <span className={isHypoxic ? 'text-red-400 font-bold' : 'text-cyan-300 font-bold'}>
                {patient.spo2}
              </span>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 block font-sans">{t('heartRate', 'Heart Rate')}</span>
              <span className="text-purple-300 font-bold">{patient.heartRate} bpm</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 block font-sans">{t('respiratoryRate', 'Resp. Rate')}</span>
              <span className="text-sky-300 font-bold">{patient.respiratoryRate}/min</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 block font-sans">{t('bloodPressure', 'Blood Press.')}</span>
              <span className="text-emerald-300 font-bold">{patient.bloodPressure}</span>
            </div>
          </div>
        </div>
      )}

      {/* Triage Urgency Header Banner */}
      <div
        className={`p-3 rounded-2xl border flex items-center justify-between shadow-lg ${
          result.triageUrgency === 'urgent'
            ? 'bg-red-500/15 border-red-500/40 text-red-200'
            : result.triageUrgency === 'moderate'
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {result.triageUrgency === 'urgent' ? (
            <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0 animate-bounce" />
          ) : result.triageUrgency === 'moderate' ? (
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          )}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              {t('aiTriageClassification', 'AI Triage Classification')}
            </div>
            <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>{result.predictedClass.toUpperCase()}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/40 font-mono text-cyan-300">
                {result.confidence}%
              </span>
            </div>
          </div>
        </div>

        <div className="text-right font-mono text-[10px] text-slate-400">
          <div>{t('latency', 'LATENCY')}: {result.inferenceLatencyMs}ms</div>
          <div className="text-emerald-400 font-bold">{t('offline100', '100% OFFLINE')}</div>
        </div>
      </div>

      {/* Mel-Spectrogram & XAI Canvas */}
      <div className="bg-navy-950 border border-slate-800 rounded-2xl p-3 shadow-inner space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('melSpectrogramTitle', '128-Mel Spectrogram & XAI Attention')}</span>
          </div>

          <button
            onClick={() => setShowXAI(!showXAI)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1 transition border cursor-pointer ${
              showXAI
                ? 'bg-red-500/20 text-red-300 border-red-500/30 font-bold'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {showXAI ? (
              <>
                <Eye className="w-3 h-3 text-red-400" /> {t('xaiHeatmapOn', 'XAI Heatmap ON')}
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3" /> {t('xaiHeatmapOff', 'XAI Heatmap OFF')}
              </>
            )}
          </button>
        </div>

        {/* Canvas Display */}
        <div className="relative rounded-xl overflow-hidden border border-slate-800/90 shadow-2xl">
          <canvas
            ref={canvasRef}
            width={380}
            height={160}
            className="w-full h-40 bg-black block cursor-pointer"
            onClick={toggleAudioPlayback}
          />
        </div>

        {/* Explainability Callout Badge */}
        <div className="bg-navy-900/90 border border-slate-800/80 rounded-xl p-2.5 flex items-start gap-2 text-xs">
          <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="text-[11px] font-bold text-slate-200 flex items-center gap-2">
              <span>{t('flaggedWindow', 'Flagged Time Window')}:</span>
              <span className="font-mono text-amber-300 bg-amber-500/15 px-1.5 py-0.2 rounded border border-amber-500/30">
                {xai.primaryTimeWindow}
              </span>
              <span className="font-mono text-cyan-300 text-[10px]">({xai.peakFrequencyRange})</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">{xai.clinicalRationale}</p>
          </div>
        </div>

        {/* Audio Control Bar */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={toggleAudioPlayback}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-800 to-slate-700 text-slate-100 rounded-xl text-xs font-semibold hover:brightness-110 transition border border-slate-600/50 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-cyan-400" /> {t('pauseAudio', 'Pause Audio')}
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-cyan-400" /> {t('playAuscultation', 'Play Auscultation')} ({playbackProgress > 0 ? `${(playbackProgress * 4).toFixed(1)}s` : '4.0s'})
              </>
            )}
          </button>

          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[160px]">
            {auscultationSite}
          </span>
        </div>
      </div>

      {/* Multi-Biomarker Confidence Breakdown */}
      <div className="bg-navy-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg space-y-2">
        <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
          <span>{t('multiBiomarkerMatrix', 'Multi-Biomarker Confidence Matrix')}</span>
          <span className="text-[9px] font-mono text-cyan-400">{t('softmaxPosterior', 'Softmax Posterior')}</span>
        </div>

        <div className="space-y-1.5">
          {(['Normal', 'Wheeze', 'Crackle', 'Stridor', 'Murmur'] as const).map((cls) => {
            const prob = result.classProbabilities[cls] || 0;
            const isWinner = cls === result.predictedClass;

            return (
              <div key={cls} className="space-y-0.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className={isWinner ? 'text-white font-bold' : 'text-slate-400'}>
                    {cls} {isWinner && '★'}
                  </span>
                  <span className={isWinner ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                    {(prob * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-navy-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isWinner
                        ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                        : 'bg-slate-700'
                    }`}
                    style={{ width: `${Math.max(2, prob * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons: 1-Click Referral Slip & Retake */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onRetake}
          className="py-3 bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-2xl border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('retakeNew', 'Retake / New')}
        </button>

        <button
          onClick={onOpenReferralModal}
          className="py-3 bg-gradient-to-r from-cyan-400 to-sky-400 text-navy-950 font-black text-xs rounded-2xl shadow-glow-cyan hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-4 h-4 stroke-[2.5]" />
          {t('referralSlipBtn', '1-Click Referral Slip')}
        </button>
      </div>
    </div>
  );
};
