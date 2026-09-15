import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, User, HeartPulse, Stethoscope, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ClassificationResult } from '../ml/onnxInference';
import { XAIExplanation } from '../dsp/xaiHeatmap';
import { PatientInfo, downloadReferralSlipPDF } from '../utils/pdfExport';
import { PatientRecord } from './PatientSection';
import { LanguageCode, getTranslation } from '../utils/i18n';

interface ReferralReportModalProps {
  result: ClassificationResult;
  xai: XAIExplanation;
  auscultationSite: string;
  sourceLabel: string;
  spectrogramCanvasDataUrl?: string;
  patient: PatientRecord;
  onUpdatePatient: (updated: Partial<PatientRecord>) => void;
  onClose: () => void;
  lang?: LanguageCode;
}

export const ReferralReportModal: React.FC<ReferralReportModalProps> = ({
  result,
  xai,
  auscultationSite,
  sourceLabel,
  spectrogramCanvasDataUrl,
  patient,
  onUpdatePatient,
  onClose,
  lang = 'en',
}) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const pdfPatient: PatientInfo = {
        ...patient,
        auscultationSite: auscultationSite,
      };
      downloadReferralSlipPDF(pdfPatient, result, xai, spectrogramCanvasDataUrl);
    } catch (e) {
      console.error('PDF generation error:', e);
      alert('Failed to generate PDF. You can use the copy text option.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyText = () => {
    const textReport = `=========================================
SecondEar™ CLINICAL REFERRAL SLIP
VMEDITHON 3.0 • AI Cardiopulmonary Screening CDSS
=========================================
PATIENT DETAILS:
• Patient Name: ${patient.patientName || 'Aarav Sharma'}
• Patient ID: ${patient.patientId}
• Age / Gender: ${patient.age} / ${patient.gender}
• Primary Clinic: ${patient.clinicName}
• Auscultation Site: ${auscultationSite}

VITALS:
• SpO2: ${patient.spo2}
• Heart Rate: ${patient.heartRate} bpm
• Resp Rate: ${patient.respiratoryRate} breaths/min
• Blood Pressure: ${patient.bloodPressure}
• Primary Complaint: ${patient.chiefComplaint}

AI ACOUSTIC SCREENING RESULTS:
• Classification: ${result.predictedClass.toUpperCase()} (${result.confidence}% Confidence)
• Triage Priority: ${result.triageBadgeText}
• Flagged Time Window: ${xai.primaryTimeWindow}
• Frequency Band: ${xai.peakFrequencyRange}
• Clinical Rationale: ${xai.clinicalRationale}

CLINICIAN FIELD NOTE:
"${patient.clinicianNotes}"

DISCLAIMER: Prototype CDSS for triage assistance only. Not certified diagnostic device.
Generated: ${new Date().toLocaleString()}
=========================================`;

    navigator.clipboard.writeText(textReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto animate-fadeIn">
      <div className="bg-navy-900 border border-slate-700/80 rounded-3xl max-w-sm w-full p-4 shadow-2xl relative my-auto space-y-3.5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{t('clinicalReferralSlip', 'Clinical Referral Slip')}</h3>
              <p className="text-[10px] text-slate-400 font-mono">{t('referralDoc', 'Doc: REF-')}{patient.patientId}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={t('close', 'Close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Triage Urgency Header */}
        <div
          className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
            result.triageUrgency === 'urgent'
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : result.triageUrgency === 'moderate'
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
          }`}
        >
          {result.triageUrgency === 'urgent' ? (
            <ShieldAlert className="w-5 h-5 flex-shrink-0 animate-bounce text-red-400" />
          ) : result.triageUrgency === 'moderate' ? (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          )}
          <span className="truncate">{result.triageBadgeText}</span>
        </div>

        {/* Patient Vitals & Meta Form */}
        <div className="bg-navy-950/80 border border-slate-800 rounded-2xl p-3 space-y-2 text-xs">
          <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('patientDetails', 'Patient Details')} & {t('clinicalVitals', 'Clinical Vitals')}:</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">{t('fullName', 'Patient Name')}</label>
              <input
                type="text"
                value={patient.patientName}
                onChange={(e) => onUpdatePatient({ patientName: e.target.value })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Patient ID</label>
              <input
                type="text"
                value={patient.patientId}
                onChange={(e) => onUpdatePatient({ patientId: e.target.value })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="text-[10px] text-slate-400">{t('spo2', 'SpO2')}</label>
              <input
                type="text"
                value={patient.spo2}
                onChange={(e) => onUpdatePatient({ spo2: e.target.value })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">{t('heartRate', 'Heart Rate')}</label>
              <input
                type="text"
                value={patient.heartRate}
                onChange={(e) => onUpdatePatient({ heartRate: e.target.value })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-purple-300 font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">{t('respRate', 'Resp. Rate')}</label>
              <input
                type="text"
                value={patient.respiratoryRate}
                onChange={(e) => onUpdatePatient({ respiratoryRate: e.target.value })}
                className="w-full bg-navy-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-sky-300 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400">{t('clinicianFieldNotes', 'Clinician Field Notes')}</label>
            <textarea
              rows={2}
              value={patient.clinicianNotes}
              onChange={(e) => onUpdatePatient({ clinicianNotes: e.target.value })}
              className="w-full bg-navy-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 resize-none focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* XAI Evidence Summary */}
        <div className="bg-navy-950/80 border border-slate-800 rounded-2xl p-2.5 text-[11px] space-y-1">
          <div className="flex justify-between text-slate-400">
            <span>{t('screeningDiagnosis', 'Primary Biomarker')}:</span>
            <span className="font-bold text-cyan-300">{result.predictedClass} ({result.confidence}%)</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>{t('flaggedAnomaly', 'Anomaly Window:')}</span>
            <span className="font-mono text-amber-300">{xai.primaryTimeWindow}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>{t('spectrogramTitle', 'Frequency Focus')}:</span>
            <span className="font-mono text-slate-200">{xai.peakFrequencyRange}</span>
          </div>
        </div>

        {/* Action Buttons: PDF Download & Copy Text */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="w-full py-3 bg-gradient-to-r from-cyan-400 to-sky-400 text-navy-950 font-black text-xs rounded-2xl shadow-glow-cyan hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            {isGeneratingPdf ? t('generatingPdf', 'GENERATING PDF...') : t('downloadPdf', 'DOWNLOAD CLINICAL REFERRAL PDF')}
          </button>

          <button
            onClick={handleCopyText}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t('copied', 'COPIED TO CLIPBOARD!') : t('copyText', 'COPY SHAREABLE TRIAGE TEXT')}
          </button>
        </div>
      </div>
    </div>
  );
};
