import React, { useEffect, useState } from 'react';
import { Languages, Sparkles } from 'lucide-react';
import { useAppLanguage } from '../i18n';
import { detectScriptLanguage } from '../i18n/formatters';
import {
  getCachedTranslation,
  translateWithCache,
} from '../services/translationService';

interface TranslatableTextProps {
  text: string;
  /**
   * When true (citizen reports, comments, worker replies), automatically translates
   * when text script/language differs from the user's selected UI language.
   * When false (official announcements/notices), shows original + a "Translate" button.
   */
  autoTranslate?: boolean;
  className?: string;
}

export const TranslatableText: React.FC<TranslatableTextProps> = ({
  text,
  autoTranslate = false,
  className = '',
}) => {
  const { language, t } = useAppLanguage();
  const sourceLang = detectScriptLanguage(text);
  const needsTranslation = sourceLang !== language && text.trim().length > 0;

  const [translated, setTranslated] = useState<string | null>(() =>
    needsTranslation ? getCachedTranslation(text, language) : null
  );
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setShowingOriginal(false);
    setFailed(false);

    if (!needsTranslation) {
      setTranslated(null);
      setLoading(false);
      return;
    }

    const cached = getCachedTranslation(text, language);
    if (cached) {
      setTranslated(cached);
      setLoading(false);
      return;
    }

    setTranslated(null);

    if (!autoTranslate) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void translateWithCache(text, language).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) {
        setTranslated(res.translation);
      } else {
        setFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [text, language, needsTranslation, autoTranslate]);

  const handleManualTranslate = async () => {
    if (loading) return;
    setFailed(false);
    const cached = getCachedTranslation(text, language);
    if (cached) {
      setTranslated(cached);
      setShowingOriginal(false);
      return;
    }
    setLoading(true);
    const res = await translateWithCache(text, language);
    setLoading(false);
    if (res.ok) {
      setTranslated(res.translation);
      setShowingOriginal(false);
    } else {
      setFailed(true);
    }
  };

  if (!needsTranslation) {
    return <span className={className}>{text}</span>;
  }

  const displayTranslated = Boolean(translated && !showingOriginal);

  return (
    <span className="inline">
      <span className={className}>
        {displayTranslated ? translated : text}
      </span>{' '}
      {displayTranslated ? (
        <span className="inline-flex flex-wrap items-center gap-1.5 align-baseline ml-1">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FFF0E6] border border-[#FFD3BD] text-[10px] font-semibold text-[#964825] whitespace-nowrap">
            <Sparkles className="w-2.5 h-2.5" aria-hidden="true" />
            <span>{t('common:actions.aiTranslated')}</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowingOriginal(true);
            }}
            className="text-[11px] font-semibold text-[#964825] hover:underline cursor-pointer whitespace-nowrap"
          >
            {t('common:actions.showOriginal')}
          </button>
        </span>
      ) : translated && showingOriginal ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowingOriginal(false);
          }}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B4F78] hover:underline cursor-pointer ml-1 whitespace-nowrap"
        >
          <Languages className="w-3 h-3" aria-hidden="true" />
          <span>{t('common:actions.showTranslation')}</span>
        </button>
      ) : loading ? (
        <span className="text-[11px] text-[#7A6A62] ml-1 whitespace-nowrap">
          ({t('common:actions.translating')})
        </span>
      ) : (
        <span className="inline-flex flex-wrap items-center gap-1.5 ml-1">
          {!autoTranslate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handleManualTranslate();
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF9F2] hover:bg-[#FFF0E6] border border-[#F0E6DF] text-[11px] font-semibold text-[#964825] cursor-pointer whitespace-nowrap transition-colors"
            >
              <Languages className="w-3 h-3" aria-hidden="true" />
              <span>{t('common:actions.translate')}</span>
            </button>
          )}
          {failed && (
            <span className="text-[11px] text-[#9E2A2B]">
              {t('errors:translationFailed')}
            </span>
          )}
        </span>
      )}
    </span>
  );
};
