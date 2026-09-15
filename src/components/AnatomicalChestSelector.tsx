import React from 'react';
import { Stethoscope, Wind, Heart, Sparkles, CheckCircle2 } from 'lucide-react';
import { LanguageCode, getTranslation } from '../utils/i18n';

export interface AuscultationPoint {
  id: string;
  name: string;
  code: string;
  category: 'lung' | 'heart';
  cx: number; // percentage on SVG
  cy: number; // percentage on SVG
  presetId: 'normal' | 'wheeze' | 'crackle' | 'stridor' | 'murmur';
  clinicalFocus: string;
  nameKey: string;
  focusKey: string;
}

export const AUSCULTATION_POINTS: AuscultationPoint[] = [
  {
    id: 'trachea',
    name: 'Anterior Trachea (Subglottic)',
    nameKey: 'tracheaName',
    code: 'TRA',
    category: 'lung',
    cx: 50,
    cy: 22,
    presetId: 'stridor',
    clinicalFocus: 'Upper airway stenosis, inspiratory stridor, pediatric croup evaluation',
    focusKey: 'tracheaFocus',
  },
  {
    id: 'rul',
    name: 'Right Upper Lung Apex (RUL)',
    nameKey: 'rulName',
    code: 'RUL',
    category: 'lung',
    cx: 33,
    cy: 35,
    presetId: 'normal',
    clinicalFocus: 'Apical vesicular airflow, bronchial sound transmission',
    focusKey: 'rulFocus',
  },
  {
    id: 'lul',
    name: 'Left Upper Lung Apex (LUL)',
    nameKey: 'lulName',
    code: 'LUL',
    category: 'lung',
    cx: 67,
    cy: 35,
    presetId: 'normal',
    clinicalFocus: 'Symmetric upper lobe ventilation',
    focusKey: 'lulFocus',
  },
  {
    id: 'aortic',
    name: 'Aortic Area (2nd Right ICS)',
    nameKey: 'aorticName',
    code: 'AOR',
    category: 'heart',
    cx: 40,
    cy: 44,
    presetId: 'murmur',
    clinicalFocus: 'Aortic stenosis / ejection systolic murmurs (120–550 Hz)',
    focusKey: 'aorticFocus',
  },
  {
    id: 'pulmonic',
    name: 'Pulmonic Area (2nd Left ICS)',
    nameKey: 'pulmonicName',
    code: 'PUL',
    category: 'heart',
    cx: 60,
    cy: 44,
    presetId: 'normal',
    clinicalFocus: 'Pulmonary valve closure (P2), split S2 evaluation',
    focusKey: 'pulmonicFocus',
  },
  {
    id: 'mitral',
    name: 'Mitral Area (5th Left ICS Apex)',
    nameKey: 'mitralName',
    code: 'MIT',
    category: 'heart',
    cx: 64,
    cy: 62,
    presetId: 'murmur',
    clinicalFocus: 'Mitral regurgitation pansystolic murmur, S1 intensity',
    focusKey: 'mitralFocus',
  },
  {
    id: 'axillary',
    name: 'Bilateral Mid-Axillary Lines',
    nameKey: 'axillaryName',
    code: 'MAX',
    category: 'lung',
    cx: 22,
    cy: 60,
    presetId: 'wheeze',
    clinicalFocus: 'Bronchospasm, expiratory polyphonic musical wheezing (Asthma/COPD)',
    focusKey: 'axillaryFocus',
  },
  {
    id: 'posterior_base',
    name: 'Posterior Lower Lung Bases (RLL/LLL)',
    nameKey: 'posteriorBaseName',
    code: 'BAS',
    category: 'lung',
    cx: 34,
    cy: 75,
    presetId: 'crackle',
    clinicalFocus: 'Alveolar fluid exudation, late-inspiratory fine crackles (Pneumonia/CHF)',
    focusKey: 'posteriorBaseFocus',
  },
];

interface AnatomicalChestSelectorProps {
  selectedPointId: string;
  onSelectPoint: (point: AuscultationPoint) => void;
  lang?: LanguageCode;
}

export const AnatomicalChestSelector: React.FC<AnatomicalChestSelectorProps> = ({
  selectedPointId,
  onSelectPoint,
  lang = 'en',
}) => {
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);
  const selectedPoint = AUSCULTATION_POINTS.find((p) => p.id === selectedPointId) || AUSCULTATION_POINTS[0];

  const localizedName = t(selectedPoint.nameKey, selectedPoint.name);
  const localizedFocus = t(selectedPoint.focusKey, selectedPoint.clinicalFocus);

  return (
    <div className="glass-card rounded-2xl p-3.5 space-y-3 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>{t('chestSelectorTitle', 'Interactive Anatomical Auscultation Map')}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-cyan-400/10 text-cyan-300 rounded border border-cyan-400/20">
                {t('tapPoint', 'TAP POINT')}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">{t('positionCoupler', 'Position stethoscope / phone microphone coupler on chest')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span> {t('lung', 'Lung')}
          </span>
          <span className="flex items-center gap-1 text-purple-300">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span> {t('heart', 'Heart')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Interactive SVG Torso Map */}
        <div className="md:col-span-5 relative w-full aspect-[4/5] max-h-56 mx-auto bg-navy-950/80 rounded-2xl border border-slate-800/80 flex items-center justify-center p-2 shadow-inner group">
          <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-md">
            {/* Torso Outline */}
            <path
              d="M75,20 C75,10 125,10 125,20 C140,24 165,36 175,60 C185,85 180,140 170,195 C168,205 160,220 150,225 C130,230 70,230 50,225 C40,220 32,205 30,195 C20,140 15,85 25,60 C35,36 60,24 75,20 Z"
              fill="rgba(15, 23, 42, 0.7)"
              stroke="rgba(56, 189, 248, 0.25)"
              strokeWidth="2"
            />
            {/* Clavicles & Sternum */}
            <path d="M50,45 Q100,60 150,45" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1.5" />
            <path d="M100,55 L100,160" fill="none" stroke="rgba(56, 189, 248, 0.15)" strokeWidth="1.5" strokeDasharray="3,3" />
            {/* Ribcage arcs */}
            <path d="M55,90 Q100,110 145,90" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
            <path d="M50,120 Q100,145 150,120" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
            <path d="M45,150 Q100,180 155,150" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />

            {/* Lungs Silhouette */}
            <path
              d="M50,60 C50,60 85,65 92,100 C98,140 85,180 50,185 C35,185 35,140 38,100 C40,75 50,60 50,60 Z"
              fill="rgba(56, 189, 248, 0.04)"
              stroke="rgba(56, 189, 248, 0.15)"
              strokeWidth="1"
            />
            <path
              d="M150,60 C150,60 115,65 108,100 C102,140 115,180 150,185 C165,185 165,140 162,100 C160,75 150,60 150,60 Z"
              fill="rgba(56, 189, 248, 0.04)"
              stroke="rgba(56, 189, 248, 0.15)"
              strokeWidth="1"
            />
            {/* Heart Silhouette */}
            <path
              d="M95,110 C90,95 110,95 115,110 C120,130 105,150 95,160 C85,150 70,130 75,110 C80,95 90,95 95,110 Z"
              fill="rgba(168, 85, 247, 0.08)"
              stroke="rgba(168, 85, 247, 0.25)"
              strokeWidth="1"
            />

            {/* Interactive Auscultation Points */}
            {AUSCULTATION_POINTS.map((pt) => {
              const isSelected = selectedPointId === pt.id;
              const isHeart = pt.category === 'heart';
              const posX = (pt.cx / 100) * 200;
              const posY = (pt.cy / 100) * 240;

              return (
                <g
                  key={pt.id}
                  onClick={() => onSelectPoint(pt)}
                  className="cursor-pointer transition-all duration-300"
                >
                  {/* Pulse Ring for Selected */}
                  {isSelected && (
                    <circle
                      cx={posX}
                      cy={posY}
                      r={14}
                      fill="none"
                      stroke={isHeart ? '#c084fc' : '#00f5d4'}
                      strokeWidth="2"
                      className="animate-ping origin-center opacity-75"
                    />
                  )}

                  {/* Outer Glow Halo */}
                  <circle
                    cx={posX}
                    cy={posY}
                    r={isSelected ? 10 : 7}
                    fill={isHeart ? 'rgba(168, 85, 247, 0.4)' : 'rgba(0, 245, 212, 0.35)'}
                    stroke={isSelected ? '#ffffff' : isHeart ? '#a855f7' : '#00f5d4'}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />

                  {/* Center Dot */}
                  <circle
                    cx={posX}
                    cy={posY}
                    r={isSelected ? 4 : 3}
                    fill={isSelected ? '#ffffff' : isHeart ? '#e9d5ff' : '#ccfbf1'}
                  />

                  {/* Tag label */}
                  <text
                    x={posX}
                    y={posY - 11}
                    textAnchor="middle"
                    fill={isSelected ? '#ffffff' : '#94a3b8'}
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight={isSelected ? 'bold' : 'normal'}
                  >
                    {pt.code}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Point Clinical Detail Panel */}
        <div className="md:col-span-7 space-y-2">
          <div className="bg-navy-950/90 border border-slate-800 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1">
                {selectedPoint.category === 'heart' ? (
                  <Heart className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <Wind className="w-3.5 h-3.5 text-sky-400" />
                )}
                {selectedPoint.category === 'heart' ? t('heartAuscultationPoint', 'HEART AUSCULTATION POINT') : t('lungAuscultationPoint', 'LUNG AUSCULTATION POINT')} [{selectedPoint.code}]
              </span>

              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                {t('activeSite', 'ACTIVE SITE')}
              </span>
            </div>

            <h4 className="text-sm font-extrabold text-white">{localizedName}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{localizedFocus}</p>
          </div>

          {/* Quick Select Pill Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {AUSCULTATION_POINTS.map((pt) => {
              const isSelected = selectedPointId === pt.id;
              return (
                <button
                  key={pt.id}
                  onClick={() => onSelectPoint(pt)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition flex items-center gap-1 border ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-glow-cyan/20 font-bold'
                      : 'bg-navy-950/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{pt.code}</span>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
