import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import {
  LANGUAGE_OPTIONS,
  useAppLanguage,
  type AppLanguage,
} from '../i18n';

export const LanguageSwitcher: React.FC<{ align?: 'left' | 'right' }> = ({
  align = 'right',
}) => {
  const { language, setLanguage, t } = useAppLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentOpt =
    LANGUAGE_OPTIONS.find((opt) => opt.code === language) ??
    LANGUAGE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleSelect = (code: AppLanguage) => {
    setLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('common:aria.switchLanguage')}
        aria-expanded={open}
        aria-haspopup="menu"
        className="h-9 px-3 rounded-full bg-white border border-[#F0E6DF] hover:bg-[#FFF0E6] text-xs font-semibold text-[#5A4A42] inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
      >
        <Globe className="w-3.5 h-3.5 text-[#964825]" aria-hidden="true" />
        <span>{currentOpt.shortCode}</span>
        <ChevronDown className="w-3 h-3 text-[#7A6A62]" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('common:aria.languageMenu')}
          className={`absolute ${
            align === 'left' ? 'left-0' : 'right-0'
          } mt-2 w-48 bg-white border border-[#F0E6DF] rounded-2xl shadow-lg p-1.5 space-y-1 z-40`}
        >
          {LANGUAGE_OPTIONS.map((opt) => {
            const active = opt.code === language;
            return (
              <button
                key={opt.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => handleSelect(opt.code)}
                className={`w-full px-3 py-2 rounded-xl text-left text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#FFF0E6] text-[#5A4A42] font-semibold'
                    : 'text-[#7A6A62] hover:bg-[#FFF9F2] hover:text-[#5A4A42]'
                }`}
              >
                <span className="truncate">{opt.nativeLabel}</span>
                {active && (
                  <Check
                    className="w-4 h-4 text-[#964825] shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const LanguagesSettingsSection: React.FC = () => {
  const {
    language,
    setLanguage,
    useNativeNumerals,
    setUseNativeNumerals,
    t,
  } = useAppLanguage();

  return (
    <div className="space-y-2 py-2 border-b border-[#F5EDE6]">
      <div className="px-2 text-xs font-bold text-[#7A6A62] flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-[#964825]" aria-hidden="true" />
        <span>{t('common:settings.languagesHeading')}</span>
      </div>

      <div className="space-y-1" role="group" aria-label={t('common:aria.languageMenu')}>
        {LANGUAGE_OPTIONS.map((opt) => {
          const active = opt.code === language;
          return (
            <button
              key={opt.code}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => setLanguage(opt.code)}
              className={`w-full px-2.5 py-2 rounded-xl text-left text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                active
                  ? 'bg-[#FFF0E6] text-[#5A4A42] font-semibold'
                  : 'text-[#7A6A62] hover:bg-[#FFF9F2] hover:text-[#5A4A42]'
              }`}
            >
              <span className="truncate">{opt.nativeLabel}</span>
              {active && (
                <Check
                  className="w-4 h-4 text-[#964825] shrink-0"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {language !== 'en' && (
        <div className="px-2 pt-1.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#5A4A42] leading-snug">
              {t('common:settings.useNativeNumerals')}
            </div>
            <div className="text-[11px] text-[#7A6A62] leading-snug">
              {t('common:settings.useNativeNumeralsHint')}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={useNativeNumerals}
            onClick={() => setUseNativeNumerals(!useNativeNumerals)}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              useNativeNumerals ? 'bg-[#5FCB8A]' : 'bg-[#E5D7CE]'
            }`}
          >
            <span
              className={`block w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                useNativeNumerals ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
};
