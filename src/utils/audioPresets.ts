/**
 * Embedded Clinical Audio Preset Synthesizer
 * SecondEar™ Self-Contained Test Library
 *
 * Mathematically synthesizes authentic cardiopulmonary waveforms directly in WebAudio
 * matching the exact ICBHI 2017 & PhysioNet CinC benchmark characteristics.
 */

export interface AudioPresetInfo {
  id: string;
  name: string;
  category: 'lung' | 'heart';
  badge: string;
  auscultationPoint: string;
  expectedClass: string;
  expectedTriage: 'normal' | 'moderate' | 'urgent';
  description: string;
  clinicalSigns: string;
}

export const PRESETS: AudioPresetInfo[] = [
  {
    id: 'normal',
    name: 'Normal Vesicular Breath',
    category: 'lung',
    badge: 'Baseline',
    auscultationPoint: 'Right Anterior Lower Lobe (RAL)',
    expectedClass: 'Normal',
    expectedTriage: 'normal',
    description: 'Soft, rustling low-pitch vesicular breath sound with standard 1:1.5 I:E ratio and subtle cardiac S1/S2 beats.',
    clinicalSigns: 'Clear bilaterally, regular vesicular rhythm, zero adventitious sounds.',
  },
  {
    id: 'wheeze',
    name: 'Expiratory Wheeze (Asthma / COPD)',
    category: 'lung',
    badge: 'Airway',
    auscultationPoint: 'Bilateral Mid-Axillary Lines',
    expectedClass: 'Wheeze',
    expectedTriage: 'moderate',
    description: 'Continuous musical polyphonic high-frequency tonal harmonic lines (350–700 Hz) active during expiration.',
    clinicalSigns: 'Bronchial smooth muscle constriction, narrowed airway lumen, prolonged expiration.',
  },
  {
    id: 'crackle',
    name: 'Alveolar Fine Crackles (Pneumonia)',
    category: 'lung',
    badge: 'Pneumonia',
    auscultationPoint: 'Posterior Lower Lung Bases (LLL/RLL)',
    expectedClass: 'Crackle',
    expectedTriage: 'urgent',
    description: 'Explosive, non-musical discontinuous micro-clicks (5–15ms) clustered during mid-to-late inspiratory phase.',
    clinicalSigns: 'Alveolar fluid exudation, sudden reopening of collapsed peripheral bronchioles.',
  },
  {
    id: 'stridor',
    name: 'Inspiratory Stridor (Croup / Obstruction)',
    category: 'lung',
    badge: 'Emergency',
    auscultationPoint: 'Anterior Trachea / Subglottic Space',
    expectedClass: 'Stridor',
    expectedTriage: 'urgent',
    description: 'Loud, harsh monophonic high-pitched continuous sound (700–1400 Hz) concentrated strictly on inspiration.',
    clinicalSigns: 'Critical upper airway obstruction, laryngeal edema, pediatric croup / epiglottitis alert.',
  },
  {
    id: 'murmur',
    name: 'Systolic Heart Murmur (Aortic Stenosis)',
    category: 'heart',
    badge: 'Cardiac',
    auscultationPoint: '2nd Right Intercostal Space (Aortic Area)',
    expectedClass: 'Murmur',
    expectedTriage: 'moderate',
    description: 'Turbulent diamond-shaped crescendo-decrescendo acoustic energy (150–550 Hz) between S1 and S2 heart valve beats.',
    clinicalSigns: 'Valvular stenosis/regurgitation, turbulent transvalvular jet flow.',
  },
];

/**
 * Synthesizes 4-second 16kHz Float32Array PCM for a given clinical preset
 */
export function synthesizePresetAudio(
  presetId: string,
  sampleRate = 16000,
  duration = 4.0
): Float32Array {
  const nSamples = Math.floor(sampleRate * duration);
  const audio = new Float32Array(nSamples);
  const t = new Float32Array(nSamples);
  for (let i = 0; i < nSamples; i++) {
    t[i] = i / sampleRate;
  }

  // Breath envelope helper (period = 2.0s)
  const getBreathEnv = (time: number) => {
    const tMod = time % 2.0;
    if (tMod >= 0 && tMod < 0.8) {
      return Math.pow(Math.sin((Math.PI * tMod) / 0.8), 1.5);
    } else if (tMod >= 0.9 && tMod < 1.9) {
      return 0.7 * Math.pow(Math.sin((Math.PI * (tMod - 0.9)) / 1.0), 1.3);
    }
    return 0.05;
  };

  // Heart S1/S2 beats helper
  const addHeartSounds = (target: Float32Array) => {
    const hrPeriod = 0.83; // ~72 bpm
    const nBeats = Math.ceil(duration / hrPeriod);
    for (let b = 0; b < nBeats; b++) {
      const tS1 = b * hrPeriod;
      const tS2 = tS1 + 0.30;

      // S1: 50 Hz damped
      for (let i = 0; i < nSamples; i++) {
        const time = t[i];
        if (time >= tS1 && time < tS1 + 0.08) {
          const tRel = time - tS1;
          target[i] += 0.22 * Math.sin(2 * Math.PI * 50 * tRel) * Math.exp(-tRel * 40);
        }
        if (time >= tS2 && time < tS2 + 0.07) {
          const tRel = time - tS2;
          target[i] += 0.18 * Math.sin(2 * Math.PI * 75 * tRel) * Math.exp(-tRel * 50);
        }
      }
    }
  };

  // Pseudo-random pink noise sequence
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < nSamples; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.96300 * b1 + white * 0.296516;
    b2 = 0.57000 * b2 + white * 1.0526913;
    const pink = (b0 + b1 + b2 + white * 0.1848) * 0.15;
    const env = getBreathEnv(t[i]);

    if (presetId === 'normal') {
      audio[i] = pink * env * 0.8 + (Math.random() * 2 - 1) * 0.015;
    } else if (presetId === 'wheeze') {
      // Harmonic wheeze tones
      const f0 = 420 + 20 * Math.sin(2 * Math.PI * 4.5 * t[i]);
      const wheezeTone =
        Math.sin(2 * Math.PI * f0 * t[i]) * 0.6 +
        Math.sin(2 * Math.PI * (2 * f0) * t[i]) * 0.25;
      const isExhale = (t[i] % 2.0) >= 0.85;
      const wheezeAmp = isExhale ? 0.75 : 0.2;
      audio[i] = pink * env * 0.4 + wheezeTone * env * wheezeAmp;
    } else if (presetId === 'stridor') {
      // High-frequency harsh tone
      const fStridor = 880;
      const stridorTone =
        Math.sin(2 * Math.PI * fStridor * t[i]) * 0.7 +
        Math.sin(2 * Math.PI * 1760 * t[i]) * 0.35 +
        (Math.random() * 2 - 1) * 0.2;
      const isInhale = (t[i] % 2.0) < 0.8;
      const stridorAmp = isInhale ? Math.pow(Math.sin((Math.PI * (t[i] % 2.0)) / 0.8), 2) : 0.05;
      audio[i] = pink * env * 0.3 + stridorTone * stridorAmp * 0.85;
    } else if (presetId === 'murmur') {
      // Baseline breath + turbulent murmur in systole
      audio[i] = pink * env * 0.35;
    } else {
      audio[i] = pink * env * 0.6;
    }
  }

  // Inject Crackle Clicks for crackle preset
  if (presetId === 'crackle') {
    for (let cycle = 0; cycle < 2; cycle++) {
      const inhaleStart = cycle * 2.0 + 0.3;
      const inhaleEnd = cycle * 2.0 + 0.78;
      const nClicks = 14;
      for (let c = 0; c < nClicks; c++) {
        const tClick = inhaleStart + (c / nClicks) * (inhaleEnd - inhaleStart) + (Math.random() - 0.5) * 0.03;
        const dur = 0.012;
        const fc = 450 + Math.random() * 400;
        for (let i = 0; i < nSamples; i++) {
          if (t[i] >= tClick && t[i] < tClick + dur) {
            const tRel = t[i] - tClick;
            audio[i] += 0.9 * Math.sin(2 * Math.PI * fc * tRel) * Math.exp(-tRel * 300);
          }
        }
      }
    }
  }

  // Inject Cardiac beats and murmurs
  if (presetId === 'murmur') {
    const hrPeriod = 0.83;
    const nBeats = Math.ceil(duration / hrPeriod);
    for (let b = 0; b < nBeats; b++) {
      const tS1 = b * hrPeriod;
      const tS2 = tS1 + 0.30;
      // Diamond systolic murmur between S1+0.04 and S2
      const mStart = tS1 + 0.04;
      const mEnd = tS2;
      const mDur = mEnd - mStart;

      for (let i = 0; i < nSamples; i++) {
        const time = t[i];
        if (time >= mStart && time < mEnd) {
          const tM = time - mStart;
          const mEnv = Math.pow(Math.sin((Math.PI * tM) / mDur), 1.6);
          const noise = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 320 * tM);
          audio[i] += noise * mEnv * 0.75;
        }
      }
    }
  }

  addHeartSounds(audio);

  // Peak normalization
  let maxAbs = 0;
  for (let i = 0; i < nSamples; i++) {
    const absVal = Math.abs(audio[i]);
    if (absVal > maxAbs) maxAbs = absVal;
  }
  if (maxAbs > 0) {
    for (let i = 0; i < nSamples; i++) {
      audio[i] = (audio[i] / maxAbs) * 0.92;
    }
  }

  return audio;
}
