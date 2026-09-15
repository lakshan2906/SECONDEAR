import React from 'react';
import { Sliders, Volume2, ShieldCheck, Zap, Radio, Check, Info } from 'lucide-react';
import { LanguageCode, getTranslation } from '../utils/i18n';

interface DSPStudioProps {
  isFilterEnabled: boolean;
  onToggleFilter: (enabled: boolean) => void;
  isNoiseInjected: boolean;
  onToggleNoise: (enabled: boolean) => void;
  noiseLevel: number; // 0 to 1
  onChangeNoiseLevel: (lvl: number) => void;
  sensorMode: 'mic_coupler' | 'phone_mic' | 'digital_stethoscope';
  onChangeSensorMode: (mode: 'mic_coupler' | 'phone_mic' | 'digital_stethoscope') => void;
  lang?: LanguageCode;
}

export const DSPStudio: React.FC<DSPStudioProps> = ({
  isFilterEnabled,
  onToggleFilter,
  isNoiseInjected,
  onToggleNoise,
  noiseLevel,
  onChangeNoiseLevel,
  sensorMode,
  onChangeSensorMode,
  lang = 'en',
}) => {
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);

  return (
    <div className="glass-card rounded-2xl p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>{t('dspStudioTitle', 'Real-Time DSP & Noise Studio')}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-400/10 text-emerald-300 rounded border border-emerald-400/20">
                LIVE FILTER
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">{t('dspSubtitle', '4th-Order Butterworth (50–2,000 Hz) & Rural PHC Noise Simulator')}</p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-cyan-400 font-bold">
          {isFilterEnabled ? t('dspActive', '✓ DSP ACTIVE') : t('rawPassThru', '⚠ RAW PASS-THRU')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Butterworth Bandpass Filter Toggle */}
        <div
          onClick={() => onToggleFilter(!isFilterEnabled)}
          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
            isFilterEnabled
              ? 'bg-cyan-500/15 border-cyan-400/40 shadow-glow-cyan/15'
              : 'bg-navy-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Zap className={`w-3.5 h-3.5 ${isFilterEnabled ? 'text-cyan-400' : 'text-slate-500'}`} />
              {t('butterworthFilter', '4th-Order Butterworth Filter')}
            </div>
            <p className="text-[10px] text-slate-400">{t('butterworthDesc', '50 Hz HP (Motion) + 2000 Hz LP (Hiss)')}</p>
          </div>

          <div
            className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
              isFilterEnabled ? 'bg-cyan-400' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-navy-950 transition-transform ${
                isFilterEnabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Ambient Clinic Noise Injection Toggle */}
        <div
          onClick={() => onToggleNoise(!isNoiseInjected)}
          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
            isNoiseInjected
              ? 'bg-amber-500/15 border-amber-400/40 shadow-glow-amber/15'
              : 'bg-navy-950/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Radio className={`w-3.5 h-3.5 ${isNoiseInjected ? 'text-amber-400' : 'text-slate-500'}`} />
              {t('noiseSimulator', 'Ambient PHC Noise Simulator')}
            </div>
            <p className="text-[10px] text-slate-400">{t('noiseDesc', 'Simulate rural clinic room chatter / crying')}</p>
          </div>

          <div
            className={`w-10 h-6 rounded-full transition-colors relative p-0.5 ${
              isNoiseInjected ? 'bg-amber-400' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-navy-950 transition-transform ${
                isNoiseInjected ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Sensor Ingestion Mode Selector */}
      <div className="bg-navy-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
        <span className="text-[11px] font-semibold text-slate-300">{t('sensorInterface', 'Sensor Interface:')}</span>

        <div className="flex gap-1.5">
          <button
            onClick={() => onChangeSensorMode('mic_coupler')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition border ${
              sensorMode === 'mic_coupler'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {t('sensorBell', '3D Acoustic Bell ($2)')}
          </button>

          <button
            onClick={() => onChangeSensorMode('phone_mic')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition border ${
              sensorMode === 'phone_mic'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {t('sensorDirect', 'Direct Phone Mic')}
          </button>

          <button
            onClick={() => onChangeSensorMode('digital_stethoscope')}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono transition border ${
              sensorMode === 'digital_stethoscope'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 font-bold'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            {t('sensorUsb', 'USB/BT Stethoscope')}
          </button>
        </div>
      </div>
    </div>
  );
};
