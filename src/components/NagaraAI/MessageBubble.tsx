import React from 'react';
import { ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useAppLanguage } from '../../i18n';
import { localizeDigits } from '../../i18n/formatters';
import type { NagaraChatMessage } from '../../types/citypulse';

interface MessageBubbleProps {
  message: NagaraChatMessage;
  onRetry?: (retryPayload: string) => void;
}

function getLocalizedSourceLabel(rawLabel: string, t: TFunction): string {
  switch (rawLabel) {
    case 'BESCOM · Demo':
      return t('dataSources:bescomDemo');
    case 'BWSSB · Demo':
      return t('dataSources:bwssbDemo');
    case 'BTP Traffic · Demo':
      return t('dataSources:btpDemo');
    case 'CityPulse · Demo':
      return t('dataSources:cityPulseDemo');
    case 'Open-Meteo · External / Live':
      return t('dataSources:openMeteoLive');
    case 'Google News · External / Live':
      return t('dataSources:googleNewsLive');
    default:
      return rawLabel;
  }
}

function renderFormattedText(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    // Split URLs and **bold** tokens safely without HTML injection
    const urlOrBoldRegex = /(https?:\/\/[^\s)]+|\*\*[^*]+\*\*)/g;
    const parts = line.split(urlOrBoldRegex);

    const renderedParts = parts.map((part, pIdx) => {
      if (part.startsWith('http://') || part.startsWith('https://')) {
        return (
          <a
            key={pIdx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-[#0B4F78] hover:text-[#964825] inline-flex items-center gap-0.5 break-all"
          >
            <span>{part}</span>
            <ExternalLink className="w-3 h-3 inline shrink-0" aria-hidden="true" />
          </a>
        );
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={pIdx} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={pIdx}>{part}</React.Fragment>;
    });

    return (
      <div
        key={lineIdx}
        className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}
      >
        {renderedParts}
      </div>
    );
  });
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onRetry,
}) => {
  const { language, useNativeNumerals, t } = useAppLanguage();
  const isUser = message.role === 'user';
  const formattedTimestamp = localizeDigits(
    message.timestamp,
    language,
    useNativeNumerals
  );

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#FF9B71] text-white px-3.5 py-2.5 text-sm font-medium shadow-sm">
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
          <div className="text-[10px] text-white/85 text-right mt-1 tabular-nums">
            {formattedTimestamp}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-1">
        <div
          className={`rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm border ${
            message.isError
              ? 'bg-[#FFF1EE] border-[#FFC4B8] text-[#5A4A42]'
              : 'bg-[#FFF4E8] border-[#F0E6DF] text-[#5A4A42]'
          }`}
        >
          <div className="space-y-0.5 break-words">
            {renderFormattedText(message.content)}
          </div>

          {message.sources && message.sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#F0E6DF]/80 flex flex-wrap gap-1.5">
              {message.sources.map((src, idx) => {
                const label = getLocalizedSourceLabel(src.label, t);
                return src.url ? (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#B6DDFB] text-[10px] font-semibold text-[#0B4F78] hover:bg-[#E8F4FD]"
                  >
                    <span>{label}</span>
                    <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                  </a>
                ) : (
                  <span
                    key={idx}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                      src.kind === 'External / Live'
                        ? 'bg-[#E8F4FD] border-[#B6DDFB] text-[#0B4F78]'
                        : 'bg-white border-[#F0E6DF] text-[#7A6A62]'
                    }`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          )}

          {message.isError && message.retryPayload && onRetry && (
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => onRetry(message.retryPayload!)}
                className="h-8 px-3 rounded-full bg-white hover:bg-[#FFF0E6] border border-[#F0E6DF] text-xs font-semibold text-[#964825] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                <span>{t('nagara:retry')}</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-1 text-[10px] text-[#7A6A62]">
          <span className="inline-flex items-center gap-1 font-medium">
            <Sparkles className="w-2.5 h-2.5 text-[#FF9B71]" aria-hidden="true" />
            <span>{t('nagara:aiGenerated')}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formattedTimestamp}</span>
        </div>
      </div>
    </div>
  );
};
