import React from 'react';
import { History, Clock, ChevronRight, Trash2, ArrowLeft } from 'lucide-react';
import { ClassificationResult } from '../ml/onnxInference';
import { SpectrogramResult } from '../dsp/melSpectrogram';
import { XAIExplanation } from '../dsp/xaiHeatmap';
import { PatientRecord } from './PatientSection';
import { LanguageCode, getTranslation } from '../utils/i18n';

export interface HistoryItem {
  id: string;
  timestamp: string;
  result: ClassificationResult;
  spec: SpectrogramResult;
  xai: XAIExplanation;
  audioData: Float32Array;
  sourceLabel: string;
  auscultationSite: string;
  patient?: PatientRecord;
}

interface HistoryScreenProps {
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onBackToRecord: () => void;
  lang?: LanguageCode;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  history,
  onSelectHistoryItem,
  onClearHistory,
  onBackToRecord,
  lang = 'en',
}) => {
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);

  return (
    <div className="flex-1 flex flex-col justify-between py-2 animate-fadeIn space-y-3">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToRecord}
              className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <History className="w-4 h-4 text-cyan-400" />
              {t('screeningHistoryTitle', 'Screening History')} ({history.length})
            </h2>
          </div>

          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-mono cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> {t('clearAllHistory', 'Clear')}
            </button>
          )}
        </div>

        {/* History List */}
        {history.length === 0 ? (
          <div className="text-center py-12 space-y-2 bg-navy-900/40 border border-slate-800/80 rounded-2xl p-6">
            <History className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-400">{t('noScreeningsSession', 'No screenings recorded yet this session.')}</p>
            <p className="text-[10px] text-slate-500">{t('recordedAudioPresetsAppear', 'Recorded audio & test presets will appear here for instant replay.')}</p>
            <button
              onClick={onBackToRecord}
              className="mt-3 px-4 py-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold hover:bg-cyan-500/30 cursor-pointer"
            >
              {t('startNewScreening', 'Start New Screening')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => {
              const res = item.result;
              const isUrgent = res.triageUrgency === 'urgent';
              const isModerate = res.triageUrgency === 'moderate';

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectHistoryItem(item)}
                  className="w-full text-left bg-navy-900/80 hover:bg-navy-850 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-3 transition flex items-center justify-between group shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                          isUrgent
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : isModerate
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {res.predictedClass}
                      </span>
                      <span className="text-xs font-bold text-slate-100">{res.confidence}%</span>
                      {item.patient && (
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20 truncate max-w-[120px]">
                          {item.patient.patientName} ({item.patient.patientId})
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-300 font-medium truncate max-w-[240px]">
                      {item.sourceLabel}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.timestamp}
                      </span>
                      <span className="truncate max-w-[140px]">{item.auscultationSite}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <button
          onClick={onBackToRecord}
          className="w-full py-3 bg-gradient-to-r from-cyan-400 to-sky-400 text-navy-950 font-black text-xs rounded-2xl shadow-glow-cyan hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          {t('recordNewAuscultation', 'RECORD NEW AUSCULTATION')}
        </button>
      )}
    </div>
  );
};
