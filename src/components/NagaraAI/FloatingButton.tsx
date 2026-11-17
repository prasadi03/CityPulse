import React from 'react';
import { useAppLanguage } from '../../i18n';
import { formatNumber } from '../../i18n/formatters';

interface NagaraMonogramProps {
  size?: number;
}

export const NagaraMonogram: React.FC<NagaraMonogramProps> = ({ size = 28 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-hidden="true"
  >
    {/* Rounded 'N' whose diagonal stroke forms a city-pulse waveform */}
    <path
      d="M7.5 23.5V9.5C7.5 8.67 8.48 8.23 9.1 8.79L12.6 14.8L15.1 11.1L17.9 20.6L20.2 16.4L23.2 22.8C23.62 23.45 24.5 23.16 24.5 22.4V8.5"
      stroke="#FFFFFF"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface FloatingButtonProps {
  isOpen: boolean;
  unreadCount: number;
  onClick: () => void;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  isOpen,
  unreadCount,
  onClick,
}) => {
  const { language, useNativeNumerals, t } = useAppLanguage();

  if (isOpen) return null;

  const formattedUnread =
    unreadCount > 99
      ? `${formatNumber(99, language, useNativeNumerals)}+`
      : formatNumber(unreadCount, language, useNativeNumerals);

  return (
    <div className="fixed right-4 bottom-20 md:right-6 md:bottom-6 z-40 pb-[env(safe-area-inset-bottom)] group">
      {/* Subtle slow idle pulse ring */}
      <span
        aria-hidden="true"
        className="nagara-pulse-ring absolute inset-0 rounded-full bg-gradient-to-br from-[#FF9B71]/45 to-[#FFC93C]/45 pointer-events-none"
      />

      {/* Hover / Focus Tooltip */}
      <span
        role="tooltip"
        className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 rounded-full bg-white border border-[#F0E6DF] text-xs font-semibold text-[#5A4A42] shadow-[0_6px_18px_-4px_rgba(122,106,98,0.2)]"
      >
        NagaraAI
      </span>

      <button
        type="button"
        onClick={onClick}
        aria-label={
          unreadCount > 0
            ? t('nagara:openUnreadAria', { count: unreadCount })
            : t('nagara:openAria')
        }
        className="relative w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[#FF9B71] to-[#FFC93C] shadow-[0_10px_26px_-4px_rgba(255,155,113,0.55)] flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B71] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFF9F2] cursor-pointer"
      >
        <NagaraMonogram size={28} />

        {/* Small green live dot at top-right corner */}
        <span
          title={t('nagara:live')}
          aria-label={t('nagara:live')}
          className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#5FCB8A] border-2 border-white shadow-sm"
        />

        {/* Unread count coral badge when new updates arrive while closed */}
        {unreadCount > 0 && (
          <span
            aria-label={t('nagara:unreadAria', { count: unreadCount })}
            className="absolute -top-1 -left-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#E05252] text-white text-[11px] font-bold border-2 border-white flex items-center justify-center tabular-nums shadow-sm"
          >
            {formattedUnread}
          </span>
        )}
      </button>
    </div>
  );
};
