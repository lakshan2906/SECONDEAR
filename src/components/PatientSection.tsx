import React, { useState } from 'react';
import {
  User,
  HeartPulse,
  Activity,
  Thermometer,
  ShieldAlert,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  Building2,
  Save,
  X
} from 'lucide-react';

import { LanguageCode, getTranslation } from '../utils/i18n';

export interface PatientRecord {
  patientName: string;
  patientId: string;
  age: string;
  gender: 'Male' | 'Female' | 'Pediatric' | 'Other';
  spo2: string;
  heartRate: string;
  respiratoryRate: string;
  bloodPressure: string;
  temperature: string;
  chiefComplaint: string;
  medicalHistory: string;
  clinicName: string;
  clinicianNotes: string;
}

export interface DemoPatientProfile extends PatientRecord {
  caseTitle: string;
  icon: string;
  presetId: 'normal' | 'wheeze' | 'crackle' | 'stridor' | 'murmur';
  pointId: string;
}

export const DEMO_PATIENTS: DemoPatientProfile[] = [
  {
    caseTitle: 'Pediatric Asthma (Wheeze)',
    icon: '🧒',
    presetId: 'wheeze',
    pointId: 'axillary',
    patientName: 'Aarav Sharma',
    patientId: 'PT-9042',
    age: '6y',
    gender: 'Pediatric',
    spo2: '93%',
    heartRate: '112',
    respiratoryRate: '34',
    bloodPressure: '95/60',
    temperature: '38.2°C',
    chiefComplaint: 'Acute expiratory wheezing, nocturnal dry cough (3 days)',
    medicalHistory: 'Childhood Asthma, Seasonal Bronchospasm',
    clinicName: 'Rural PHC Sector 4 (Thiruvallur)',
    clinicianNotes: 'Decreased air entry in bilateral lung bases. Marked musical expiratory wheezes.',
  },
  {
    caseTitle: 'Elderly COPD (Wheeze/Rhonchi)',
    icon: '🧓',
    presetId: 'wheeze',
    pointId: 'axillary',
    patientName: 'Rajesh Kumar',
    patientId: 'PT-8831',
    age: '58y',
    gender: 'Male',
    spo2: '89%',
    heartRate: '98',
    respiratoryRate: '26',
    bloodPressure: '138/88',
    temperature: '37.1°C',
    chiefComplaint: 'Exertional dyspnea, chronic smoker cough with morning sputum',
    medicalHistory: 'COPD Gold Stage II, Heavy Tobacco Smoker (30 pack-years)',
    clinicName: 'Community Health Centre - Ward 2',
    clinicianNotes: 'Hyperinflated barrel chest, prolonged expiratory phase with low pitch rhonchi.',
  },
  {
    caseTitle: 'Pneumonia (Basal Crackles)',
    icon: '👩',
    presetId: 'crackle',
    pointId: 'posterior_base',
    patientName: 'Sunita Devi',
    patientId: 'PT-7619',
    age: '45y',
    gender: 'Female',
    spo2: '91%',
    heartRate: '104',
    respiratoryRate: '28',
    bloodPressure: '124/80',
    temperature: '39.0°C',
    chiefComplaint: 'High-grade fever with chills, productive rust-colored sputum, chest pain',
    medicalHistory: 'Type 2 Diabetes, Biomass chulha fuel exposure',
    clinicName: 'Sub-Centre Kanchipuram North',
    clinicianNotes: 'Late inspiratory fine Velcro-like crackles audible at right posterior lower base.',
  },
  {
    caseTitle: 'Croup / Laryngitis (Stridor)',
    icon: '👶',
    presetId: 'stridor',
    pointId: 'trachea',
    patientName: 'Priya Sen',
    patientId: 'PT-5120',
    age: '3y',
    gender: 'Pediatric',
    spo2: '94%',
    heartRate: '125',
    respiratoryRate: '36',
    bloodPressure: '90/55',
    temperature: '38.6°C',
    chiefComplaint: 'Sudden onset barking seal-like cough, harsh inspiratory crowing noise',
    medicalHistory: 'Viral Laryngotracheobronchitis (Croup)',
    clinicName: 'Pediatric Urgent Care Ward',
    clinicianNotes: 'High-pitched monophonic inspiratory stridor maximal over subglottic trachea.',
  },
  {
    caseTitle: 'Cardiac Murmur (Systolic VSD)',
    icon: '💓',
    presetId: 'murmur',
    pointId: 'mitral',
    patientName: 'Ananya Iyer',
    patientId: 'PT-6204',
    age: '8m',
    gender: 'Pediatric',
    spo2: '96%',
    heartRate: '142',
    respiratoryRate: '40',
    bloodPressure: '80/50',
    temperature: '36.8°C',
    chiefComplaint: 'Poor feeding, diaphoresis during feeds, mild tachypnea',
    medicalHistory: 'Suspected Congenital Heart Defect (VSD / Mitral Regurgitation)',
    clinicName: 'Mother & Child Care Unit',
    clinicianNotes: 'Harsh holosystolic regurgitant murmur (Grade 3/6) over mitral apex and LLSB.',
  },
  {
    caseTitle: 'Normal Baseline (Healthy)',
    icon: '🩺',
    presetId: 'normal',
    pointId: 'rul',
    patientName: 'Vikram Patel',
    patientId: 'PT-1001',
    age: '32y',
    gender: 'Male',
    spo2: '99%',
    heartRate: '72',
    respiratoryRate: '16',
    bloodPressure: '118/76',
    temperature: '36.6°C',
    chiefComplaint: 'Routine occupational wellness screening (Asymptomatic)',
    medicalHistory: 'No prior cardiopulmonary illness, non-smoker',
    clinicName: 'Urban Primary Health Centre',
    clinicianNotes: 'Normal vesicular breath sounds across all lobes. Normal S1/S2 heart sounds.',
  },
];

const QUICK_SYMPTOMS = [
  'Wheezing',
  'Fine Crackles',
  'Barking Cough',
  'Inspiratory Stridor',
  'Shortness of Breath',
  'Chest Tightness',
  'Fever',
];

interface PatientSectionProps {
  patient: PatientRecord;
  onUpdatePatient: (updated: Partial<PatientRecord>) => void;
  onSavePatient?: () => void;
  onClose?: () => void;
  isCompact?: boolean;
  lang?: LanguageCode;
}

export const PatientSection: React.FC<PatientSectionProps> = ({
  patient,
  onUpdatePatient,
  onSavePatient,
  onClose,
  isCompact = false,
  lang = 'en',
}) => {
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);

  const numericSpo2 = parseInt(patient.spo2.replace(/[^0-9]/g, ''), 10) || 98;
  const isHypoxic = numericSpo2 < 92;
  const numericHR = parseInt(patient.heartRate.replace(/[^0-9]/g, ''), 10) || 75;
  const isTachycardic = numericHR > 105;

  const handleResetBlank = () => {
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
  };

  const handleToggleSymptom = (symptom: string) => {
    const current = patient.chiefComplaint || '';
    if (current.includes(symptom)) {
      const updated = current
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== symptom)
        .join(', ');
      onUpdatePatient({ chiefComplaint: updated });
    } else {
      const updated = current ? `${current}, ${symptom}` : symptom;
      onUpdatePatient({ chiefComplaint: updated });
    }
  };

  // Compact summary card for mobile or minimal headers
  if (isCompact && !isExpanded) {
    return (
      <div className="bg-navy-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">
              {patient.patientName || 'Anonymous'} ({patient.patientId})
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-[11px] text-cyan-300 font-medium hover:underline flex items-center gap-0.5"
          >
            <span>Edit Intake</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
          <div className={`p-1 rounded-lg border ${isHypoxic ? 'bg-red-500/15 border-red-500/30 text-red-300' : 'bg-navy-950 border-slate-800 text-cyan-300'}`}>
            <span className="text-[8px] text-slate-400 block font-sans">SpO2</span>
            {patient.spo2}
          </div>
          <div className={`p-1 rounded-lg border ${isTachycardic ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-navy-950 border-slate-800 text-purple-300'}`}>
            <span className="text-[8px] text-slate-400 block font-sans">HR</span>
            {patient.heartRate}
          </div>
          <div className="p-1 rounded-lg bg-navy-950 border border-slate-800 text-sky-300">
            <span className="text-[8px] text-slate-400 block font-sans">RR</span>
            {patient.respiratoryRate}
          </div>
          <div className="p-1 rounded-lg bg-navy-950 border border-slate-800 text-emerald-300">
            <span className="text-[8px] text-slate-400 block font-sans">BP</span>
            {patient.bloodPressure}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section 1: Demographics */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          {t('patientInfo', 'Patient Information')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-semibold text-slate-300 mb-1 block">
              {t('fullName', 'Full Name')}
            </label>
            <input
              type="text"
              value={patient.patientName}
              onChange={(e) => onUpdatePatient({ patientName: e.target.value })}
              placeholder="e.g. Aarav Sharma"
              className="w-full bg-navy-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-300 mb-1 block">
              {t('age', 'Age')}
            </label>
            <input
              type="text"
              value={patient.age}
              onChange={(e) => onUpdatePatient({ age: e.target.value })}
              placeholder="e.g. 6y"
              className="w-full bg-navy-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-300 mb-1 block">
              {t('gender', 'Gender')}
            </label>
            <select
              value={patient.gender}
              onChange={(e) => onUpdatePatient({ gender: e.target.value as PatientRecord['gender'] })}
              className="w-full bg-navy-950 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="Male">{t('male', 'Male')}</option>
              <option value="Female">{t('female', 'Female')}</option>
              <option value="Pediatric">{t('pediatric', 'Pediatric')}</option>
              <option value="Other">{t('other', 'Other')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Vitals Telemetry */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          {t('clinicalVitals', 'Clinical Vitals')}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div>
            <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
              {t('spo2', 'SpO2')} (%)
            </label>
            <input
              type="text"
              value={patient.spo2}
              onChange={(e) => onUpdatePatient({ spo2: e.target.value })}
              className={`w-full bg-navy-950 border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold ${
                isHypoxic ? 'border-red-500 text-red-300 bg-red-950/30' : 'border-slate-700 text-cyan-300'
              }`}
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
              {t('heartRate', 'Heart Rate')} (bpm)
            </label>
            <input
              type="text"
              value={patient.heartRate}
              onChange={(e) => onUpdatePatient({ heartRate: e.target.value })}
              className={`w-full bg-navy-950 border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold ${
                isTachycardic ? 'border-amber-500 text-amber-300 bg-amber-950/30' : 'border-slate-700 text-purple-300'
              }`}
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
              {t('respRate', 'Resp. Rate')} (/min)
            </label>
            <input
              type="text"
              value={patient.respiratoryRate}
              onChange={(e) => onUpdatePatient({ respiratoryRate: e.target.value })}
              className="w-full bg-navy-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-sky-300 font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
              {t('bloodPressure', 'Blood Pressure')}
            </label>
            <input
              type="text"
              value={patient.bloodPressure}
              onChange={(e) => onUpdatePatient({ bloodPressure: e.target.value })}
              className="w-full bg-navy-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-300 font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-300 font-semibold mb-1 block">
              {t('temperature', 'Temp')} (°C)
            </label>
            <input
              type="text"
              value={patient.temperature}
              onChange={(e) => onUpdatePatient({ temperature: e.target.value })}
              className="w-full bg-navy-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-mono font-bold"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Symptoms & Notes */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          {t('chiefComplaint', 'Chief Complaint & Symptoms')}
        </div>

        {/* Quick Symptom Chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_SYMPTOMS.map((tag) => {
            const active = (patient.chiefComplaint || '').includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleToggleSymptom(tag)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                  active
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-sm'
                    : 'bg-navy-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {active && <Check className="w-3 h-3 text-cyan-400" />}
                {tag}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={patient.chiefComplaint}
          onChange={(e) => onUpdatePatient({ chiefComplaint: e.target.value })}
          placeholder="e.g. Acute expiratory wheezing, fever, dry cough (3 days)"
          className="w-full bg-navy-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-medium"
        />

        <textarea
          rows={2}
          value={patient.clinicianNotes}
          onChange={(e) => onUpdatePatient({ clinicianNotes: e.target.value })}
          placeholder={t('notesPlaceholder', 'Auscultation notes or medical history (optional)...')}
          className="w-full bg-navy-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none font-medium"
        />
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
        <button
          type="button"
          onClick={handleResetBlank}
          className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 font-medium transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t('clearPatient', 'Clear / New Patient')}</span>
        </button>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              {t('cancel', 'Cancel')}
            </button>
          )}

          {onSavePatient && (
            <button
              type="button"
              onClick={onSavePatient}
              className="px-5 py-2 bg-gradient-to-r from-cyan-400 via-sky-400 to-cyan-300 text-navy-950 font-bold text-xs rounded-xl shadow-glow-cyan hover:brightness-110 active:scale-95 transition flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{t('savePatient', 'Save Patient')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
