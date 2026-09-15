import React, { useState } from 'react';
import {
  Stethoscope,
  Activity,
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  Sparkles,
  FileText,
  History as HistoryIcon,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Eye,
  EyeOff,
  Wind,
  HeartPulse,
  User,
  Building2,
  AlertCircle,
  Edit3,
  X,
  Smartphone,
  UserPlus,
  Sun,
  Moon,
  Globe,
  ChevronDown
} from 'lucide-react';
import { AnatomicalChestSelector, AUSCULTATION_POINTS, AuscultationPoint } from './AnatomicalChestSelector';
import { DSPStudio } from './DSPStudio';
import { DisclaimerBanner } from './DisclaimerBanner';
import { PatientSection, PatientRecord, DEMO_PATIENTS, DemoPatientProfile } from './PatientSection';
import { HistoryModal } from './HistoryModal';
import { HistoryItem } from './HistoryScreen';
import { PRESETS, AudioPresetInfo } from '../utils/audioPresets';
import { ClassificationResult } from '../ml/onnxInference';
import { SpectrogramResult } from '../dsp/melSpectrogram';
import { XAIExplanation } from '../dsp/xaiHeatmap';
import { SUPPORTED_LANGUAGES, LanguageCode, getTranslation } from '../utils/i18n';

interface CommandCenterDashboardProps {
  // Theme & Language
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  lang: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  // History
  history: HistoryItem[];
  onSelectHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  // Patient state
  patient: PatientRecord;
  onUpdatePatient: (updated: Partial<PatientRecord>) => void;
  // Audio state
  isRecording: boolean;
  recordingSeconds: number;
  currentAudio: Float32Array | null;
  currentLabel: string;
  selectedPointId: string;
  onSelectPoint: (point: AuscultationPoint) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSelectPreset: (presetId: string) => void;
  selectedPresetId: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // Playback state
  isPlaying: boolean;
  playbackProgress: number;
  onTogglePlayback: () => void;
  // DSP Studio state
  isFilterEnabled: boolean;
  onToggleFilter: (enabled: boolean) => void;
  isNoiseInjected: boolean;
  onToggleNoise: (enabled: boolean) => void;
  noiseLevel: number;
  onChangeNoiseLevel: (lvl: number) => void;
  sensorMode: 'mic_coupler' | 'phone_mic' | 'digital_stethoscope';
  onChangeSensorMode: (mode: 'mic_coupler' | 'phone_mic' | 'digital_stethoscope') => void;
  // Action
  onRunScreening: () => void;
  isProcessing: boolean;
  // Results
  result: ClassificationResult | null;
  spec: SpectrogramResult | null;
  xai: XAIExplanation | null;
  showXAI: boolean;
  onToggleXAI: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onOpenReferralModal: () => void;
  onRetake: () => void;
  // Device mode switcher
  isMobileView: boolean;
  onToggleViewMode: () => void;
}

export const CommandCenterDashboard: React.FC<CommandCenterDashboardProps> = ({
  theme,
  onToggleTheme,
  lang,
  onSelectLanguage,
  history,
  onSelectHistoryItem,
  onClearHistory,
  patient,
  onUpdatePatient,
  isRecording,
  recordingSeconds,
  currentAudio,
  currentLabel,
  selectedPointId,
  onSelectPoint,
  onStartRecording,
  onStopRecording,
  onSelectPreset,
  selectedPresetId,
  onFileUpload,
  isPlaying,
  playbackProgress,
  onTogglePlayback,
  isFilterEnabled,
  onToggleFilter,
  isNoiseInjected,
  onToggleNoise,
  noiseLevel,
  onChangeNoiseLevel,
  sensorMode,
  onChangeSensorMode,
  onRunScreening,
  isProcessing,
  result,
  spec,
  xai,
  showXAI,
  onToggleXAI,
  canvasRef,
  waveformCanvasRef,
  onOpenReferralModal,
  onRetake,
  isMobileView,
  onToggleViewMode,
}) => {
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);

  // Check vitals alert
  const numericSpo2 = parseInt(patient.spo2.replace(/[^0-9]/g, ''), 10) || 98;
  const isHypoxic = numericSpo2 < 92;
  const numericHR = parseInt(patient.heartRate.replace(/[^0-9]/g, ''), 10) || 75;
  const isTachycardic = numericHR > 105;

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  const handleDemoPatientSelect = (demo: DemoPatientProfile) => {
    onUpdatePatient(demo);
    const point =
      AUSCULTATION_POINTS.find((p) => p.id === demo.pointId) ||
      AUSCULTATION_POINTS.find((p) => p.presetId === demo.presetId);
    if (point) {
      onSelectPoint(point);
    } else {
      onSelectPreset(demo.presetId);
    }
  };

  const handleOpenAddPatientModal = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    onUpdatePatient({
      patientName: '',
      patientId: `PT-${randomNum}`,
      age: '',
      gender: 'Male',
      spo2: '98%',
      heartRate: '76',
      respiratoryRate: '18',
      bloodPressure: '120/80',
      temperature: '36.8°C',
      chiefComplaint: '',
      medicalHistory: '',
      clinicName: 'Primary Health Centre',
      clinicianNotes: '',
    });
    setShowPatientModal(true);
  };

  const getPresetName = (presetId: string, defaultName: string) => {
    const keyMap: Record<string, string> = {
      normal: 'presetNormalName',
      wheeze: 'presetWheezeName',
      crackle: 'presetCrackleName',
      stridor: 'presetStridorName',
      murmur: 'presetMurmurName',
    };
    return t(keyMap[presetId] || '', defaultName);
  };

  const getPresetSigns = (presetId: string, defaultSigns: string) => {
    const keyMap: Record<string, string> = {
      normal: 'presetNormalSigns',
      wheeze: 'presetWheezeSigns',
      crackle: 'presetCrackleSigns',
      stridor: 'presetStridorSigns',
      murmur: 'presetMurmurSigns',
    };
    return t(keyMap[presetId] || '', defaultSigns);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 py-3 space-y-3.5">
      {/* 1. Formal Telemetry & Viewport Switcher Header */}
      <header className="glass-card rounded-2xl px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl border border-cyan-500/20 relative z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center shadow-glow-cyan">
            <Stethoscope className="w-5 h-5 text-navy-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                {t('appTitle', 'SecondEar™')}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-full font-bold">
                VMEDITHON 3.0
              </span>
            </div>
            <p className="text-xs text-slate-400">{t('appSubtitle', 'Offline-First Cardiopulmonary Acoustic Biomarker Screening CDSS')}</p>
          </div>
        </div>

        {/* Telemetry Status Badges & Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{t('edgeEngineSpeed', 'Edge Engine: <50ms')}</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 shadow-inner">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('samplingRate', 'Sampling: 16 kHz PCM')}</span>
          </div>

          {/* Language Selector Dropdown */}
          <div className="relative z-50">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition shadow-sm cursor-pointer"
              title={t('language', 'Change Interface Language')}
            >
              <span className="text-sm">{currentLangObj.flag}</span>
              <span className="font-bold">{currentLangObj.nativeLabel}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showLangMenu && (
              <>
                {/* Backdrop dismiss overlay */}
                <div
                  className="fixed inset-0 z-[990]"
                  onClick={() => setShowLangMenu(false)}
                />

                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-52 bg-[#070d1e] border-2 border-cyan-400/60 rounded-2xl p-2 shadow-[0_12px_40px_rgba(0,0,0,0.9)] z-[999] animate-fadeIn space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold border-b border-slate-800/80 mb-1">
                    {t('language', 'Select Language')}
                  </div>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        onSelectLanguage(l.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        lang === l.code
                          ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                          : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{l.flag}</span>
                        <div className="flex flex-col">
                          <span className="font-bold leading-tight">{l.nativeLabel}</span>
                          <span className="text-[10px] text-slate-400 leading-tight">({l.label})</span>
                        </div>
                      </div>
                      {lang === l.code && <span className="text-cyan-400 text-xs font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 rounded-xl transition shadow-sm"
            title={theme === 'dark' ? t('themeLight', 'Switch to Light Mode') : t('themeDark', 'Switch to Dark Mode')}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-sky-400" />
            )}
          </button>

          {/* History Button */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-navy-950 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-semibold transition shadow-sm"
            title={t('historyTitle', 'View Previous Screening Sessions')}
          >
            <HistoryIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('historyBtn', 'History')}</span>
            <span className="px-1.5 py-0.2 bg-cyan-400/20 text-cyan-300 rounded text-[10px] font-mono font-bold">
              {history.length}
            </span>
          </button>

          {/* View Mode Switcher */}
          <button
            onClick={onToggleViewMode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition shadow-md"
            title="Toggle Phone Frame Simulation"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">{t('switchToPhone', 'Phone View')}</span>
          </button>
        </div>
      </header>

      {/* 2. Persistent Formal Regulatory Disclaimer Banner */}
      <DisclaimerBanner lang={lang} />

      {/* 3. Top Patient Telemetry & Vitals Ribbon */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 border border-cyan-500/20 shadow-lg space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Patient Bio */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_12px_rgba(0,245,212,0.15)]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">
                  {patient.patientName || t('anonymousPatient', 'Anonymous Patient')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-400/10 text-cyan-300 rounded border border-cyan-400/30 font-bold">
                  {patient.patientId}
                </span>
                <span className="text-xs text-slate-400">
                  ({patient.age || 'Age N/A'} • {patient.gender})
                </span>
              </div>
              {patient.chiefComplaint && (
                <div className="text-[11px] text-slate-400 truncate max-w-md">
                  {patient.chiefComplaint}
                </div>
              )}
            </div>
          </div>

          {/* Vitals Ribbon & Single Add Patient Action */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className={`px-2.5 py-1 rounded-xl border text-center font-mono ${isHypoxic ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse' : 'bg-navy-950 border-slate-800 text-cyan-300'}`}>
              <span className="text-[8px] text-slate-400 block font-sans font-semibold">{t('spo2', 'SpO2')}</span>
              <span className="text-xs font-bold">{patient.spo2}</span>
            </div>

            <div className={`px-2.5 py-1 rounded-xl border text-center font-mono ${isTachycardic ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse' : 'bg-navy-950 border-slate-800 text-purple-300'}`}>
              <span className="text-[8px] text-slate-400 block font-sans font-semibold">{t('heartRate', 'HR')}</span>
              <span className="text-xs font-bold">{patient.heartRate}</span>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-navy-950 border border-slate-800 text-center font-mono text-sky-300">
              <span className="text-[8px] text-slate-400 block font-sans font-semibold">{t('respRate', 'RR')}</span>
              <span className="text-xs font-bold">{patient.respiratoryRate}</span>
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-navy-950 border border-slate-800 text-center font-mono text-emerald-300">
              <span className="text-[8px] text-slate-400 block font-sans font-semibold">{t('bloodPressure', 'BP')}</span>
              <span className="text-xs font-bold">{patient.bloodPressure}</span>
            </div>

            {/* Single Clean Add Patient Button */}
            <button
              onClick={handleOpenAddPatientModal}
              className="ml-1 px-3.5 py-2 bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-300 hover:brightness-110 text-navy-950 font-bold rounded-xl text-xs shadow-glow-cyan transition flex items-center gap-1.5 active:scale-95"
              title="Register a new blank patient record"
            >
              <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t('addPatient', '+ Add Patient')}</span>
            </button>

            {/* Edit Button */}
            <button
              onClick={() => setShowPatientModal(true)}
              className="px-2.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              title="Edit patient intake details"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{t('editPatient', 'Edit')}</span>
            </button>
          </div>
        </div>

        {/* Quick Patient Case Selector Strip */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px] scrollbar-thin">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            {t('demoPatients', 'Demo Patients:')}
          </span>

          <div className="flex items-center gap-1.5">
            {DEMO_PATIENTS.map((demo) => {
              const isSelected = patient.patientName === demo.patientName;
              return (
                <button
                  key={demo.patientId}
                  onClick={() => handleDemoPatientSelect(demo)}
                  className={`px-2.5 py-1 rounded-lg border whitespace-nowrap transition text-xs flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_8px_rgba(0,245,212,0.2)]'
                      : 'bg-navy-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{demo.icon}</span>
                  <span className="font-semibold">{demo.patientName}</span>
                  <span className="text-[9px] text-cyan-400/80 font-mono">({demo.presetId})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Balanced 3-Column Main Clinical Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Anatomical Torso, Presets, and DSP Studio (4 cols) */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* Interactive Anatomical Chest Selector */}
          <AnatomicalChestSelector
            selectedPointId={selectedPointId}
            onSelectPoint={onSelectPoint}
            lang={lang}
          />

          {/* Clinical Presets Picker */}
          <div className="glass-card rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                {t('benchmarkPresets', 'Benchmark Clinical Presets:')}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">{t('oneClickEval', '1-CLICK EVAL')}</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {PRESETS.map((p) => {
                const isSelected = selectedPresetId === p.id && !isRecording;
                const locName = getPresetName(p.id, p.name);
                const locSigns = getPresetSigns(p.id, p.clinicalSigns);

                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectPreset(p.id)}
                    className={`p-2.5 rounded-xl border transition text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/60 shadow-glow-cyan/20'
                        : 'bg-navy-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
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
                        <div className="text-xs font-bold text-slate-100">{locName}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{locSigns}</div>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
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

          {/* DSP Signal Studio */}
          <DSPStudio
            isFilterEnabled={isFilterEnabled}
            onToggleFilter={onToggleFilter}
            isNoiseInjected={isNoiseInjected}
            onToggleNoise={onToggleNoise}
            noiseLevel={noiseLevel}
            onChangeNoiseLevel={onChangeNoiseLevel}
            sensorMode={sensorMode}
            onChangeSensorMode={onChangeSensorMode}
            lang={lang}
          />
        </div>

        {/* CENTER COLUMN: Waveform & 128-Mel Spectrogram + XAI (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Audio Ingestion & Live Oscilloscope Card */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-cyan-400'}`}></span>
                {isRecording ? `${t('recordingInProgress', 'RECORDING:')} ${recordingSeconds.toFixed(1)}s / 4.0s` : currentLabel}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">{t('recordingPcm', '16 kHz • 16-bit PCM')}</span>
            </div>

            <canvas
              ref={waveformCanvasRef}
              width={600}
              height={120}
              className="w-full h-28 bg-navy-950/90 rounded-xl border border-slate-800 shadow-inner"
            />

            {/* Record / Listen / Upload Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={isRecording ? onStopRecording : onStartRecording}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse shadow-glow-urgent'
                      : 'bg-gradient-to-r from-cyan-500 to-sky-400 text-navy-950 shadow-glow-cyan hover:brightness-110'
                  }`}
                >
                  {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4 stroke-[2.5]" />}
                  {isRecording ? t('stopRecording', 'Stop Recording') : t('recordMic', 'Record Mic')}
                </button>

                {currentAudio && !isRecording && (
                  <button
                    onClick={onTogglePlayback}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 text-cyan-400" /> : <Play className="w-4 h-4 text-cyan-400" />}
                    {isPlaying ? t('pauseAudio', 'Pause') : t('playAudio', 'Play Audio (4s)')}
                  </button>
                )}
              </div>

              <label className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white cursor-pointer bg-navy-950 px-3.5 py-2 rounded-xl border border-slate-800 transition">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('uploadWav', 'Upload WAV')}</span>
                <input type="file" accept=".wav,audio/*" onChange={onFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* 128-Mel Spectrogram & XAI Saliency Card */}
          <div className="glass-card-accent rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white tracking-wide">
                  {t('spectrogramTitle', '128-Mel Spectrogram & Explainable AI (XAI)')}
                </h3>
              </div>

              <button
                onClick={onToggleXAI}
                className={`px-3 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition border ${
                  showXAI
                    ? 'bg-red-500/20 text-red-300 border-red-500/40 font-bold'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {showXAI ? <Eye className="w-3.5 h-3.5 text-red-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showXAI ? t('xaiHeatmapOn', 'XAI Heatmap ON') : t('xaiHeatmapOff', 'XAI Heatmap OFF')}</span>
              </button>
            </div>

            {/* Spectrogram Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800/90 shadow-2xl">
              <canvas
                ref={canvasRef}
                width={600}
                height={220}
                className="w-full h-52 bg-black block cursor-pointer"
                onClick={onTogglePlayback}
              />
            </div>

            {/* XAI Anomaly Highlight Badge */}
            {xai && result && (
              <div className="bg-navy-950/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-xs">
                <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{t('flaggedAnomaly', 'Flagged Anomaly Window:')}</span>
                    <span className="font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                      {xai.primaryTimeWindow}
                    </span>
                    <span className="font-mono text-cyan-300 text-[11px]">({xai.peakFrequencyRange})</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{xai.clinicalRationale}</p>
                </div>
              </div>
            )}

            {/* Big Primary CTA Button: Run Screening */}
            <button
              onClick={onRunScreening}
              disabled={isRecording || isProcessing}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 text-navy-950 font-black text-sm rounded-2xl shadow-glow-cyan hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-navy-950 stroke-[3]" />
              {isProcessing ? t('runningAi', 'RUNNING ON-DEVICE AI INFERENCE...') : t('runAiScreening', 'RUN ON-DEVICE AI SCREENING')}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Triage Decision, Biomarkers & Referral Slip (3 cols) */}
        <div className="lg:col-span-3 space-y-3.5">
          {/* Classification & Triage Banner */}
          {result ? (
            <div
              className={`p-4 rounded-2xl border space-y-3 shadow-xl ${
                result.triageUrgency === 'urgent'
                  ? 'bg-red-500/15 border-red-500/40 text-red-200'
                  : result.triageUrgency === 'moderate'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {result.triageUrgency === 'urgent' ? (
                  <ShieldAlert className="w-8 h-8 text-red-400 flex-shrink-0 animate-bounce" />
                ) : result.triageUrgency === 'moderate' ? (
                  <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                )}
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">{t('screeningDiagnosis', 'Screening Diagnosis')}</div>
                  <div className="text-base font-extrabold text-white">{t(result.predictedClass.toLowerCase(), result.predictedClass).toUpperCase()}</div>
                </div>
              </div>

              <div className="bg-black/40 rounded-xl p-2.5 flex items-center justify-between font-mono text-xs">
                <span>{t('confidence', 'Confidence:')}</span>
                <span className="text-cyan-300 font-bold">{result.confidence}%</span>
              </div>

              {/* Multi-Biomarker Confidence Matrix */}
              <div className="space-y-1.5">
                {(['Normal', 'Wheeze', 'Crackle', 'Stridor', 'Murmur'] as const).map((cls) => {
                  const prob = result.classProbabilities[cls] || 0;
                  const isWinner = cls === result.predictedClass;
                  return (
                    <div key={cls} className="space-y-0.5">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className={isWinner ? 'text-white font-bold' : 'text-slate-400'}>
                          {t(cls.toLowerCase(), cls)} {isWinner && '★'}
                        </span>
                        <span className={isWinner ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                          {(prob * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-navy-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isWinner ? 'bg-gradient-to-r from-cyan-400 to-emerald-400' : 'bg-slate-700'
                          }`}
                          style={{ width: `${Math.max(2, prob * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={onOpenReferralModal}
                className="w-full py-3 bg-gradient-to-r from-cyan-400 to-sky-400 text-navy-950 font-black text-xs rounded-xl shadow-glow-cyan hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 stroke-[2.5]" />
                {t('referralSlipBtn', '1-Click Clinical Referral Slip')}
              </button>
            </div>
          ) : (
            <div className="glass-card rounded-2xl p-6 text-center space-y-3 border border-slate-800">
              <Activity className="w-10 h-10 text-cyan-400 mx-auto animate-pulse" />
              <h4 className="text-sm font-bold text-white">{t('readyForScreening', 'Ready for Screening')}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('readyDescription', 'Select an anatomical chest position or benchmark preset, record or play audio, and click RUN ON-DEVICE AI SCREENING.')}
              </p>
            </div>
          )}

          {/* Clinical Guidance / Protocol Card */}
          <div className="glass-card rounded-2xl p-3.5 space-y-2 text-xs border border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
              {t('triageProtocols', 'Triage Referral Protocols:')}
            </h4>
            <div className="space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
              <p className="text-slate-300">
                • {t('triageUrgent', 'Urgent (Red): Stridor / severe bronchospasm with SpO2 < 92%. Initiate emergency referral.')}
              </p>
              <p className="text-slate-300">
                • {t('triageModerate', 'Moderate (Yellow): Unilateral basal crackles / systolic murmur. Follow with secondary imaging.')}
              </p>
              <p className="text-slate-300">
                • {t('triageRoutine', 'Routine (Green): Symmetrical vesicular sounds. Routine outpatient follow-up.')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Clean Patient Intake & Telemetry Modal */}
      {showPatientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-navy-900 border border-cyan-500/40 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Single Clean Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_12px_rgba(0,245,212,0.2)]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{t('patientIntakeTitle', 'Patient Intake & Telemetry')}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-400/10 text-cyan-300 rounded border border-cyan-400/30 font-bold">
                      {patient.patientId || 'PT-9042'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">{t('patientIntakeSubtitle', 'Demographics, clinical vitals & complaints')}</p>
                </div>
              </div>

              <button
                onClick={() => setShowPatientModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title={t('close', 'Close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Clean Single Patient Form Body */}
            <PatientSection
              patient={patient}
              onUpdatePatient={onUpdatePatient}
              onSavePatient={() => setShowPatientModal(false)}
              onClose={() => setShowPatientModal(false)}
              isCompact={false}
              lang={lang}
            />
          </div>
        </div>
      )}

      {/* 6. Web-Side Screening History Modal */}
      <HistoryModal
        history={history}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onSelectHistoryItem={(item) => {
          onSelectHistoryItem(item);
          setShowHistoryModal(false);
        }}
        onClearHistory={onClearHistory}
        onOpenReferralFor={(item) => {
          onSelectHistoryItem(item);
          onOpenReferralModal();
        }}
        lang={lang}
      />

      {/* 7. Formal Medical System Footer */}
      <footer className="pt-2 text-center text-[10px] font-mono text-slate-500 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 px-2">
        <span>{t('footerTitle', 'SecondEar™ v1.0.0 • Class B SaMD Research Prototype')}</span>
        <span>{t('footerTrack', 'VMEDITHON 3.0 • Sri Sairam Engineering College (Bio-Engineering Track)')}</span>
        <span className="text-emerald-400">{t('footerZeroCloud', 'Zero-Cloud On-Device Execution')}</span>
      </footer>
    </div>
  );
};
