import React, { useState } from 'react';
import { DisclaimerBanner } from './DisclaimerBanner';
import { Activity, Mic, History, WifiOff, Battery, Stethoscope, ChevronDown, Sun, Moon } from 'lucide-react';
import { LanguageCode, SUPPORTED_LANGUAGES, getTranslation } from '../utils/i18n';

interface PhoneFrameProps {
  children: React.ReactNode;
  activeTab: 'record' | 'processing' | 'results' | 'history';
  onTabChange: (tab: 'record' | 'processing' | 'results' | 'history') => void;
  hasResults: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  lang?: LanguageCode;
  onSelectLanguage?: (lang: LanguageCode) => void;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  activeTab,
  onTabChange,
  hasResults,
  theme = 'dark',
  onToggleTheme,
  lang = 'en',
  onSelectLanguage,
}) => {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const t = (key: string, fallback?: string) => getTranslation(lang, key, fallback);
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="mobile-viewport bg-navy-950 border-x sm:border border-slate-800/80 text-slate-100 flex flex-col justify-between select-none relative">
      {/* Top Mobile Status Bar */}
      <div className="pt-2 px-4 pb-1 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-navy-950/90 z-20">
        <span className="font-semibold text-slate-200">{currentTime}</span>

        {/* Dynamic Island / Device Pill */}
        <div className="bg-black/90 border border-slate-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-inner">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-[10px] text-cyan-300 font-medium">{t('offlinePill', '100% Offline Edge CDSS')}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-300">
          <span title="Zero Cloud Connectivity Needed"><WifiOff className="w-3.5 h-3.5 text-emerald-400" /></span>
          <Battery className="w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>

      {/* Persistent Disclaimer */}
      <DisclaimerBanner lang={lang} />

      {/* App Brand Header */}
      <header className="px-3.5 py-2.5 bg-navy-900/80 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between z-30 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center shadow-glow-cyan">
            <Stethoscope className="w-4 h-4 text-navy-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">{t('appTitle', 'SecondEar™')}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded font-bold">
                VMEDITHON
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide">{t('appSubtitle', 'Cardiopulmonary Acoustic AI')}</p>
          </div>
        </div>

        {/* Mobile Header Controls: Theme Toggle & Language Switcher */}
        <div className="flex items-center gap-1.5">
          {/* Mobile Theme Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-cyan-300 border border-slate-700 rounded-lg transition shadow-sm cursor-pointer"
              title={theme === 'dark' ? t('themeLight', 'Light Mode') : t('themeDark', 'Dark Mode')}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>
          )}

          {/* Mobile Language Switcher */}
          {onSelectLanguage && (
            <div className="relative z-40">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold shadow-sm cursor-pointer"
                title={t('language', 'Change Language')}
                aria-label="Change Language"
              >
                <span className="text-xs">{currentLangObj.flag}</span>
                <span className="text-[11px] font-bold">{currentLangObj.nativeLabel}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showLangMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[990]"
                    onClick={() => setShowLangMenu(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-44 bg-[#070d1e] border-2 border-cyan-400/60 rounded-xl p-1 shadow-2xl z-[999] animate-fadeIn space-y-0.5">
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => {
                          onSelectLanguage(l.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition cursor-pointer ${
                          lang === l.code
                            ? 'bg-cyan-500/25 text-cyan-300 font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{l.flag}</span>
                          <span className="font-bold">{l.nativeLabel}</span>
                        </div>
                        {lang === l.code && <span className="text-cyan-400 text-xs font-bold">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Screen Body */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col p-3.5">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bg-navy-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around z-20">
        <button
          onClick={() => onTabChange('record')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            activeTab === 'record'
              ? 'text-cyan-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className={`w-5 h-5 ${activeTab === 'record' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px]">{t('navRecord', 'Record')}</span>
        </button>

        <button
          onClick={() => hasResults && onTabChange('results')}
          disabled={!hasResults}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            !hasResults
              ? 'text-slate-600 cursor-not-allowed opacity-40'
              : activeTab === 'results'
              ? 'text-cyan-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className={`w-5 h-5 ${activeTab === 'results' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px]">{t('navAnalysis', 'Analysis')}</span>
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all ${
            activeTab === 'history'
              ? 'text-cyan-400 font-semibold scale-105'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className={`w-5 h-5 ${activeTab === 'history' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px]">{t('navHistory', 'History')}</span>
        </button>
      </nav>
    </div>
  );
};
