import React, { useEffect, useState } from 'react';
import { Radio, Filter, Grid, Cpu, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';
import { LanguageCode, getTranslation } from '../utils/i18n';

interface ProcessingScreenProps {
  onComplete: () => void;
  lang?: LanguageCode;
}

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({ onComplete, lang = 'en' }) => {
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);
  const [activeStep, setActiveStep] = useState(0);

  const STAGES = [
    {
      id: 1,
      title: t('stage1_title', 'Audio Acquisition'),
      detail: t('stage1_desc', '16.0 kHz Mono 16-bit PCM Signal Buffering'),
      icon: Radio,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-500/40',
      bg: 'bg-cyan-500/10',
    },
    {
      id: 2,
      title: t('stage2_title', 'DSP Signal Conditioning'),
      detail: t('stage2_desc', '4th-Order Butterworth Bandpass (50–2,000 Hz) + Spectral Gating'),
      icon: Filter,
      color: 'text-sky-400',
      borderColor: 'border-sky-500/40',
      bg: 'bg-sky-500/10',
    },
    {
      id: 3,
      title: t('stage3_title', 'Time-Frequency Transform'),
      detail: t('stage3_desc', '128-Mel Filterbank Log-Spectrogram (25ms Window, 10ms Hop)'),
      icon: Grid,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/40',
      bg: 'bg-purple-500/10',
    },
    {
      id: 4,
      title: t('stage4_title', 'Edge Neural Network'),
      detail: t('stage4_desc', '1D-CNN + Temporal Convolutional Network (TCN) On-Device Forward Pass'),
      icon: Cpu,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      bg: 'bg-amber-500/10',
    },
    {
      id: 5,
      title: t('stage5_title', 'Explainable AI & Referral'),
      detail: t('stage5_desc', 'Grad-CAM Attention Heatmap Saliency + 1-Click CDSS Slip Generation'),
      icon: ShieldCheck,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/40',
      bg: 'bg-emerald-500/10',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return prev;
        }
      });
    }, 280);

    return () => clearInterval(interval);
  }, [onComplete]);

  const progressPct = Math.round(((activeStep + 1) / STAGES.length) * 100);

  return (
    <div className="flex-1 flex flex-col justify-between py-4 animate-fadeIn">
      {/* Top Animation Banner */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
          <Activity className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          <span>{t('onDevicePipeline', 'ON-DEVICE DSP + ML PIPELINE')}</span>
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">{t('analyzingAcoustics', 'Analyzing Cardiopulmonary Acoustics')}</h2>
        <p className="text-xs text-slate-400">{t('zeroCloudRunning', 'Zero cloud calls • Running 100% locally on Edge hardware')}</p>
      </div>

      {/* 5-Stage Stepper List */}
      <div className="space-y-2.5 my-auto">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between ${
                isCurrent
                  ? `${stage.bg} ${stage.borderColor} shadow-lg scale-[1.02]`
                  : isDone
                  ? 'bg-navy-900/60 border-slate-800/80 text-slate-300 opacity-90'
                  : 'bg-navy-950/40 border-slate-900 text-slate-600 opacity-40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    isCurrent
                      ? `${stage.bg} ${stage.color} ${stage.borderColor} animate-pulse`
                      : isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-900 text-slate-600 border-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    <span>{stage.title}</span>
                    {isCurrent && (
                      <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/20 px-1.5 py-0.2 rounded animate-pulse">
                        {t('stageRunning', 'RUNNING')}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">{stage.detail}</div>
                </div>
              </div>

              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              ) : isCurrent ? (
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              ) : (
                <span className="text-[10px] font-mono text-slate-600">0{stage.id}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar & Latency Guarantee */}
      <div className="bg-navy-900/90 border border-slate-800 rounded-2xl p-3 space-y-2">
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>{t('pipelineProgress', 'PIPELINE PROGRESS')}</span>
          <span className="text-cyan-400 font-bold">{progressPct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-center text-[10px] text-slate-400 font-mono">
          {t('int8Engine', 'INT8 Quantized TCN Engine')} • {t('latency', 'Latency')}: <span className="text-emerald-400 font-bold">&lt;100ms</span>
        </div>
      </div>
    </div>
  );
};
