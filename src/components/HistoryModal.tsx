import React from 'react';
import {
  History,
  X,
  Trash2,
  RotateCcw,
  FileText,
  User,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Stethoscope
} from 'lucide-react';
import { HistoryItem } from './HistoryScreen';
import { LanguageCode, getTranslation } from '../utils/i18n';

interface HistoryModalProps {
  history: HistoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onOpenReferralFor?: (item: HistoryItem) => void;
  lang?: LanguageCode;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  history,
  isOpen,
  onClose,
  onSelectHistoryItem,
  onClearHistory,
  onOpenReferralFor,
  lang = 'en',
}) => {
  if (!isOpen) return null;

  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-navy-900 border border-cyan-500/40 rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(0,245,212,0.25)]">
              <History className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t('historyTitle', 'Screening Session History')}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-cyan-400/10 text-cyan-300 rounded-full border border-cyan-400/30 font-bold">
                  {history.length} {t('recordsCount', 'records')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('historySubtitle', 'Stored on-device screening records with spectrograms & vitals')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all stored screening history for this session?')) {
                    onClearHistory();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold transition flex items-center gap-1.5"
                title="Clear all records"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('clearAll', 'Clear All')}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* History Item List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {history.length === 0 ? (
            <div className="text-center py-16 space-y-3 bg-navy-950/60 border border-slate-800/80 rounded-2xl p-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto">
                <History className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-300">
                {t('noHistoryYet', 'No screenings recorded yet this session.')}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {t('noHistoryDesc', 'Screening results, spectrograms, and patient data will automatically be captured here for 1-click review.')}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map((item, idx) => {
                const res = item.result;
                const isUrgent = res.triageUrgency === 'urgent';
                const isModerate = res.triageUrgency === 'moderate';

                return (
                  <div
                    key={item.id || idx}
                    className="glass-card hover:border-cyan-400/50 rounded-2xl p-4 transition shadow-md space-y-3 border border-slate-800"
                  >
                    {/* Top Row: Timestamp, Diagnosis Badge, Confidence */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-xs font-mono font-extrabold uppercase px-3 py-1 rounded-full flex items-center gap-1.5 ${
                            isUrgent
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-glow-urgent/30'
                              : isModerate
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {isUrgent ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                          ) : isModerate ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>{res.predictedClass}</span>
                        </span>

                        <span className="text-xs font-mono text-cyan-300 font-bold bg-cyan-950/60 px-2.5 py-0.5 rounded-lg border border-cyan-800/50">
                          {res.confidence}% {t('confidence', 'Confidence')}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>

                    {/* Middle Row: Patient Demographics & Vitals */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-white">
                          {item.patient?.patientName || t('anonymousPatient', 'Anonymous Patient')}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                          {item.patient?.patientId || 'PT-ID'}
                        </span>
                        {item.patient?.age && (
                          <span className="text-[11px] text-slate-400">({item.patient.age})</span>
                        )}
                      </div>

                      {/* Auscultation Point */}
                      <div className="flex items-center gap-1.5 text-[11px] text-sky-300 font-mono">
                        <Stethoscope className="w-3.5 h-3.5 text-sky-400" />
                        <span>{item.auscultationSite}</span>
                      </div>
                    </div>

                    {/* Vitals Pills Snapshot */}
                    {item.patient && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-navy-950 border border-slate-800 text-cyan-300">
                          SpO2: <strong className="text-white">{item.patient.spo2}</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-navy-950 border border-slate-800 text-purple-300">
                          HR: <strong className="text-white">{item.patient.heartRate} bpm</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-navy-950 border border-slate-800 text-sky-300">
                          RR: <strong className="text-white">{item.patient.respiratoryRate}/min</strong>
                        </span>
                        <span className="px-2 py-0.5 rounded bg-navy-950 border border-slate-800 text-emerald-300">
                          BP: <strong className="text-white">{item.patient.bloodPressure}</strong>
                        </span>
                      </div>
                    )}

                    {/* Triage Badge Message */}
                    <div className="text-[11px] text-slate-400 font-medium">
                      {res.triageBadgeText}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          onSelectHistoryItem(item);
                          onClose();
                        }}
                        className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-sky-400 text-navy-950 font-bold rounded-xl text-xs hover:brightness-110 transition shadow-glow-cyan/30 flex items-center gap-1.5 active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t('restoreToWorkstation', 'Restore to Workstation')}</span>
                      </button>

                      {onOpenReferralFor && (
                        <button
                          onClick={() => {
                            onOpenReferralFor(item);
                            onClose();
                          }}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{t('exportPdf', 'Referral PDF')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
