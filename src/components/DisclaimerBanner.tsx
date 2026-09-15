import React, { useState } from 'react';
import { AlertCircle, ShieldAlert, X, Info } from 'lucide-react';
import { LanguageCode, getTranslation } from '../utils/i18n';

interface DisclaimerBannerProps {
  lang?: LanguageCode;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ lang = 'en' }) => {
  const [showModal, setShowModal] = useState(false);
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);

  return (
    <>
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-3 py-1.5 flex items-center justify-between text-[11px] text-amber-300">
        <div className="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
          <span className="font-medium truncate">
            <strong>{t('prototypeBadge', 'PROTOTYPE:')}</strong> {t('prototypeSummary', 'Assistive CDSS only • Not certified diagnostic')}
          </span>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-amber-400 hover:text-amber-200 underline text-[10px] ml-2 flex-shrink-0 font-mono"
        >
          {t('details', 'Details')}
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-amber-500/40 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-amber-400 mb-3">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-base text-white">{t('prototypeNoticeTitle', 'Clinical Prototype Notice')}</h3>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <p>
                {t('prototypeNoticeBody', 'SecondEar™ is an experimental Clinical Decision Support System (CDSS) prototype developed for VMEDITHON 3.0.')}
              </p>
              <div className="bg-navy-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="text-amber-300 font-semibold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> {t('regulatoryTitle', 'Regulatory Positioning:')}
                </div>
                <p className="text-[11px] text-slate-400">
                  {t('regulatoryBody', 'Categorized as Class B Assistive Screening Software (SaMD) under CDSCO/MDR guidelines. It is intended solely to augment, not replace, clinical judgment by registered healthcare professionals.')}
                </p>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('diagnosticWarning', 'Acoustic biomarkers must be verified with secondary diagnostic tests (e.g. Chest X-Ray, Spirometry, Echocardiography) before initiating patient therapeutic intervention.')}
              </p>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-xl text-xs hover:brightness-110 transition shadow-lg"
            >
              {t('iAcknowledge', 'I Understand & Acknowledge')}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
