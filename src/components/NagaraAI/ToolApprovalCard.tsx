import React from 'react';
import { CloudSun, Newspaper, ShieldCheck } from 'lucide-react';
import { useAppLanguage } from '../../i18n';
import type { PendingToolApproval } from '../../types/citypulse';

interface ToolApprovalCardProps {
  approval: PendingToolApproval;
  onApprove: () => void;
  onDeny: () => void;
  disabled?: boolean;
}

export const ToolApprovalCard: React.FC<ToolApprovalCardProps> = ({
  approval,
  onApprove,
  onDeny,
  disabled = false,
}) => {
  const { t } = useAppLanguage();
  const isWeather = approval.toolName === 'get_weather';
  const Icon = isWeather ? CloudSun : Newspaper;
  const toolLabel = isWeather
    ? t('nagara:tools.weather')
    : t('nagara:tools.news');
  const rawCity = approval.args.city?.trim();
  const cityArg =
    !rawCity || rawCity.toLowerCase() === 'bengaluru'
      ? t('common:bengaluru')
      : rawCity;

  return (
    <div
      role="region"
      aria-label={t('nagara:approvalRegionAria')}
      className="rounded-2xl bg-white border border-[#FFC93C] p-3.5 shadow-[0_6px_20px_-4px_rgba(255,155,113,0.22)] space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-xl bg-[#E8F4FD] text-[#0B4F78] inline-flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-xs font-bold text-[#5A4A42]">
            {t('nagara:wantsToUse', { tool: toolLabel })}
          </div>
          <div className="text-[11px] text-[#7A6A62]">
            {t('nagara:externalLookupFor')}{' '}
            <span className="font-semibold text-[#5A4A42]">{cityArg}</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8F4FD] border border-[#B6DDFB] text-[10px] font-semibold text-[#0B4F78] shrink-0">
          <ShieldCheck className="w-2.5 h-2.5" aria-hidden="true" />
          <span>{t('nagara:approvalBadge')}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onApprove}
          className="flex-1 h-9 rounded-full bg-[#5FCB8A] hover:bg-[#4EB879] disabled:opacity-60 text-[#0D3B20] text-xs font-bold transition-colors cursor-pointer"
        >
          {t('nagara:approve')}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDeny}
          className="flex-1 h-9 rounded-full bg-[#FFF9F2] hover:bg-[#FFF0E6] border border-[#F0E6DF] disabled:opacity-60 text-[#5A4A42] text-xs font-semibold transition-colors cursor-pointer"
        >
          {t('nagara:deny')}
        </button>
      </div>
    </div>
  );
};
