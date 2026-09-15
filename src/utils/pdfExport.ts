/**
 * 1-Click Clinical Referral Slip PDF Generator
 * SecondEar™ Clinical Handoff Module
 *
 * Generates an instant, standardized A4 triage summary PDF for specialist hospital referral.
 */

import { jsPDF } from 'jspdf';
import { ClassificationResult } from '../ml/onnxInference';
import { XAIExplanation } from '../dsp/xaiHeatmap';

export interface PatientInfo {
  patientName?: string;
  patientId: string;
  age: number | string;
  gender: 'Male' | 'Female' | 'Pediatric' | 'Other';
  auscultationSite: string;
  spo2: number | string;
  heartRate: number | string;
  respiratoryRate: number | string;
  bloodPressure?: string;
  temperature?: string;
  chiefComplaint?: string;
  medicalHistory?: string;
  clinicName: string;
  clinicianNotes: string;
}

export function generateReferralPDF(
  patient: PatientInfo,
  result: ClassificationResult,
  xai: XAIExplanation,
  spectrogramCanvasDataUrl?: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  // Header Banner: Deep Navy Background
  doc.setFillColor(10, 15, 29); // #0a0f1d
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Accent Line: Cyan
  doc.setFillColor(0, 245, 212); // #00f5d4
  doc.rect(0, 31, pageWidth, 1.5, 'F');

  // Title & Brand
  doc.setTextColor(0, 245, 212);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SecondEar™', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 220, 240);
  doc.text('AI-Assisted Cardiopulmonary Acoustic Screening CDSS', margin, 18);
  doc.text('VMEDITHON 3.0 • Bio-Engineering Track | Sri Sairam Engineering College', margin, 24);

  // Referral Badge in Header
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${dateStr}`, pageWidth - margin - 50, 14);
  doc.text(`Doc ID: REF-${(patient.patientId || Date.now().toString()).slice(-6)}`, pageWidth - margin - 50, 20);

  y = 38;

  // Triage Urgency Alert Box
  let alertBg = [16, 185, 129]; // green
  let alertText = 'ROUTINE AUSCULTATION — NO ACUTE ADVENTITIOUS SOUNDS';
  if (result.triageUrgency === 'moderate') {
    alertBg = [245, 158, 11]; // amber
    alertText = `MODERATE PRIORITY — ${result.predictedClass.toUpperCase()} DETECTED (${result.confidence}%)`;
  } else if (result.triageUrgency === 'urgent') {
    alertBg = [239, 68, 68]; // red
    alertText = `URGENT CLINICAL REFERRAL — ${result.predictedClass.toUpperCase()} DETECTED (${result.confidence}%)`;
  }

  doc.setFillColor(alertBg[0], alertBg[1], alertBg[2]);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(alertText, pageWidth / 2, y + 7.5, { align: 'center' });

  y += 16;

  // Section 1: Patient Demographics & Vitals Information
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 38, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('1. PATIENT DEMOGRAPHICS & CLINICAL VITALS', margin + 4, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const col1 = margin + 4;
  const col2 = margin + 62;
  const col3 = margin + 120;

  doc.text(`Patient Name: ${patient.patientName || 'Aarav Sharma'}`, col1, y + 14);
  doc.text(`Patient ID: ${patient.patientId || 'PT-9042'}`, col1, y + 20);
  doc.text(`Age / Gender: ${patient.age || '6y'} / ${patient.gender}`, col1, y + 26);
  doc.text(`Primary Clinic: ${patient.clinicName || 'Primary Health Centre (PHC)'}`, col1, y + 32);

  doc.text(`Auscultation Site: ${patient.auscultationSite}`, col2, y + 14);
  doc.text(`SpO2 Level: ${patient.spo2 || '94%'} (Room Air)`, col2, y + 20);
  doc.text(`Heart Rate: ${patient.heartRate || '88'} bpm`, col2, y + 26);
  doc.text(`Blood Pressure: ${patient.bloodPressure || '118/76 mmHg'}`, col2, y + 32);

  doc.text(`Resp. Rate: ${patient.respiratoryRate || '24'} breaths/min`, col3, y + 14);
  doc.text(`Symptoms: ${patient.chiefComplaint || 'Persistent wheezing / fever'}`, col3, y + 20, { maxWidth: 58 });
  doc.text(`Inference Engine: ${result.engineUsed}`, col3, y + 26);
  doc.text(`Edge Latency: ${result.inferenceLatencyMs} ms`, col3, y + 32);

  y += 43;

  // Section 2: AI Acoustic Biomarker Screening Results
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. ACOUSTIC BIOMARKER SCREENING ANALYSIS', margin + 4, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const classes = ['Normal', 'Wheeze', 'Crackle', 'Stridor', 'Murmur'] as const;
  const startTableY = y + 13;
  const barWidth = 38;

  classes.forEach((cls, idx) => {
    const prob = result.classProbabilities[cls] || 0;
    const isWinner = cls === result.predictedClass;
    const xPos = margin + 4 + (idx % 3) * 60;
    const rowY = startTableY + Math.floor(idx / 3) * 11;

    doc.setFont('helvetica', isWinner ? 'bold' : 'normal');
    doc.setTextColor(isWinner ? 15 : 100, isWinner ? 23 : 116, isWinner ? 42 : 139);
    doc.text(`${cls}: ${(prob * 100).toFixed(1)}%`, xPos, rowY);

    // Progress bar
    doc.setFillColor(226, 232, 240);
    doc.rect(xPos, rowY + 2, barWidth, 2.5, 'F');
    if (isWinner) {
      doc.setFillColor(alertBg[0], alertBg[1], alertBg[2]);
    } else {
      doc.setFillColor(56, 189, 248);
    }
    doc.rect(xPos, rowY + 2, barWidth * prob, 2.5, 'F');
  });

  y += 41;

  // Section 3: Explainable AI (XAI) Spectrogram Evidence
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 74, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('3. EXPLAINABLE TIME-FREQUENCY SPECTROGRAM EVIDENCE (XAI)', margin + 4, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Anomaly Time Window: ${xai.primaryTimeWindow}`, margin + 4, y + 13);
  doc.text(`Target Frequency Band: ${xai.peakFrequencyRange}`, margin + 85, y + 13);
  doc.text(`Clinical Rationale: ${xai.clinicalRationale}`, margin + 4, y + 18.5);

  // Embed Spectrogram Snapshot if available
  if (spectrogramCanvasDataUrl) {
    try {
      doc.addImage(spectrogramCanvasDataUrl, 'PNG', margin + 4, y + 21.5, pageWidth - 2 * margin - 8, 48);
    } catch (e) {
      console.warn('Could not embed spectrogram image in PDF:', e);
    }
  }

  y += 79;

  // Section 4: Specialist Referral Recommendation
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('4. RECOMMENDED CLINICAL TRIAGE ACTION', margin + 4, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  let recommendation = 'Patient exhibits clean vesicular acoustics. Maintain routine follow-up as scheduled.';
  if (result.predictedClass === 'Wheeze') {
    recommendation = 'Bronchospasm / Airway obstruction flagged. Administer bronchodilator nebulization per PHC protocol; evaluate response in 20 min.';
  } else if (result.predictedClass === 'Crackle') {
    recommendation = 'Alveolar fluid / pneumonia pattern flagged. Initiate CXR imaging; evaluate for broad-spectrum pediatric antibiotic protocol.';
  } else if (result.predictedClass === 'Stridor') {
    recommendation = 'CRITICAL: Upper airway stridor detected. Do not agitate patient. Prepare urgent oxygenation / nebulized epinephrine & emergency ENT referral.';
  } else if (result.predictedClass === 'Murmur') {
    recommendation = 'Valvular murmur signature detected. Schedule 2D Echocardiography and referral to pediatric cardiology OPD.';
  }

  doc.text(recommendation, margin + 4, y + 13, { maxWidth: pageWidth - 2 * margin - 8 });

  if (patient.clinicianNotes) {
    doc.setFont('helvetica', 'italic');
    doc.text(`Field Clinician Note: "${patient.clinicianNotes}"`, margin + 4, y + 23, { maxWidth: pageWidth - 2 * margin - 8 });
  }

  // Footer Disclaimer
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'PROTOTYPE CDSS — Not a certified medical diagnostic device. Designed for assistive triage screening only.',
    pageWidth / 2,
    pageHeight - 11,
    { align: 'center' }
  );
  doc.text(
    'SecondEar™ | VMEDITHON 3.0 | Team SANTFRIX | Sri Sairam Engineering College',
    pageWidth / 2,
    pageHeight - 7,
    { align: 'center' }
  );

  return doc;
}

export function downloadReferralSlipPDF(
  patient: PatientInfo,
  result: ClassificationResult,
  xai: XAIExplanation,
  spectrogramCanvasDataUrl?: string
) {
  const doc = generateReferralPDF(patient, result, xai, spectrogramCanvasDataUrl);
  const safeId = (patient.patientId || 'patient').replace(/[^a-zA-Z0-9_-]/g, '');
  doc.save(`SecondEar_Referral_${safeId}_${result.predictedClass}.pdf`);
}
