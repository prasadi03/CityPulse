import React, { useState } from 'react';
import {
  Zap,
  Droplets,
  Wrench,
  TrafficCone,
  Bus,
  CloudSun,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { useAppLanguage, type AppLanguage } from '../../i18n';
import {
  formatAffectedAreasList,
  formatDateLocalized,
  formatNumber,
  formatRelativeTimeText,
  formatTimeLocalized,
  getAreaLabel,
  getCategoryLabel,
  localizeDigits,
} from '../../i18n/formatters';
import type { AppUpdateItem, DepartmentId } from '../../types/citypulse';
import { TranslatableText } from '../TranslatableText';

interface UpdatesDigestProps {
  updates: AppUpdateItem[];
  newHighlightIds: Set<string>;
  roleLabel: string;
}

function getDeptIcon(deptId: DepartmentId | 'city' | 'weather') {
  switch (deptId) {
    case 'electricity':
      return { Icon: Zap, bg: 'bg-[#FFF8D6]', color: 'text-[#9A6700]' };
    case 'water':
      return { Icon: Droplets, bg: 'bg-[#E8F4FD]', color: 'text-[#0B4F78]' };
    case 'roads':
      return { Icon: Wrench, bg: 'bg-[#FFF0E6]', color: 'text-[#964825]' };
    case 'traffic':
      return { Icon: TrafficCone, bg: 'bg-[#FFEDE8]', color: 'text-[#B24020]' };
    case 'transport':
      return { Icon: Bus, bg: 'bg-[#EAF8F0]', color: 'text-[#0D3B20]' };
    case 'weather':
      return { Icon: CloudSun, bg: 'bg-[#E8F4FD]', color: 'text-[#0B4F78]' };
    default:
      return { Icon: RefreshCw, bg: 'bg-[#FFF4E8]', color: 'text-[#7A6A62]' };
  }
}

function getSourceBadgeClasses(badge: AppUpdateItem['sourceBadge']): string {
  switch (badge) {
    case 'External / Live':
      return 'bg-[#E8F4FD] text-[#0B4F78] border-[#B6DDFB]';
    case 'Official':
      return 'bg-[#EAF8F0] text-[#0D3B20] border-[#BCEAD0]';
    case 'Verified':
      return 'bg-[#FFF8D6] text-[#8A5D00] border-[#F6E299]';
    default:
      return 'bg-[#FFF0E6] text-[#964825] border-[#FFD3BD]';
  }
}

function getSourceBadgeLabel(item: AppUpdateItem, t: TFunction): string {
  if (item.sourceKey) {
    return t(`dataSources:${item.sourceKey}`);
  }
  switch (item.sourceBadge) {
    case 'External / Live':
      return t('dataSources:externalLive');
    case 'Official':
      return t('dataSources:official');
    case 'Verified':
      return t('dataSources:verified');
    default:
      return t('dataSources:demo');
  }
}

function localizeStatusToken(raw: string, t: TFunction): string {
  if (raw === 'Waiting') return t('common:status.waiting');
  if (raw === 'Ongoing') return t('common:status.ongoing');
  if (raw === 'Solved') return t('common:status.solved');
  return raw;
}

function localizePriorityToken(raw: string, t: TFunction): string {
  if (raw === 'Low') return t('common:priority.low');
  if (raw === 'Medium') return t('common:priority.medium');
  if (raw === 'High') return t('common:priority.high');
  if (raw === 'Urgent') return t('common:priority.urgent');
  return raw;
}

function formatItemArea(
  item: AppUpdateItem,
  lang: AppLanguage
): string | null {
  if (item.areaIds && item.areaIds.length > 0) {
    return item.areaIds
      .map((id) => getAreaLabel(id, lang, item.area))
      .join(' / ');
  }
  const trimmed = item.area.trim();
  if (trimmed === 'All Zones') return null; // handled with t('common:allZones')
  if (trimmed === 'Bengaluru') return null; // handled with t('common:bengaluru')
  return formatAffectedAreasList(trimmed, lang);
}

function formatDigestSummary(
  item: AppUpdateItem,
  t: TFunction,
  lang: AppLanguage,
  useNativeNumerals: boolean
): string | null {
  if (!item.i18nKey) return null;
  const rawParams = item.i18nParams ?? {};
  const localizedParams: Record<string, string | number> = { ...rawParams };

  if (rawParams.category !== undefined) {
    localizedParams.category = getCategoryLabel(String(rawParams.category), t);
  }
  if (rawParams.status !== undefined) {
    localizedParams.status = localizeStatusToken(String(rawParams.status), t);
  }
  if (rawParams.from !== undefined) {
    localizedParams.from = localizeStatusToken(String(rawParams.from), t);
  }
  if (rawParams.to !== undefined) {
    localizedParams.to = localizeStatusToken(String(rawParams.to), t);
  }
  if (rawParams.priority !== undefined) {
    localizedParams.priority = localizePriorityToken(
      String(rawParams.priority),
      t
    );
  }
  if (rawParams.date !== undefined) {
    localizedParams.date = formatDateLocalized(
      String(rawParams.date),
      lang,
      useNativeNumerals
    );
  }
  if (rawParams.time !== undefined) {
    localizedParams.time = formatTimeLocalized(
      String(rawParams.time),
      lang,
      useNativeNumerals
    );
  }
  if (rawParams.highAreaId !== undefined) {
    localizedParams.highArea = getAreaLabel(
      String(rawParams.highAreaId),
      lang,
      String(rawParams.highArea ?? '')
    );
  }
  if (rawParams.lowAreaId !== undefined) {
    localizedParams.lowArea = getAreaLabel(
      String(rawParams.lowAreaId),
      lang,
      String(rawParams.lowArea ?? '')
    );
  }

  return localizeDigits(
    t(item.i18nKey, localizedParams),
    lang,
    useNativeNumerals
  );
}

function formatPeriodLabel(
  period: string,
  t: TFunction,
  lang: AppLanguage,
  useNativeNumerals: boolean
): string {
  if (period === 'Now') return t('common:relativeTime.justNow');
  if (period === 'Now (Live)') return t('heatmap:periodLive');
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    return formatDateLocalized(period, lang, useNativeNumerals);
  }
  return localizeDigits(period, lang, useNativeNumerals);
}

export const UpdatesDigest: React.FC<UpdatesDigestProps> = ({
  updates,
  newHighlightIds,
  roleLabel,
}) => {
  const { language, useNativeNumerals, t } = useAppLanguage();
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? updates : updates.slice(0, 6);

  return (
    <div className="rounded-2xl rounded-bl-md bg-[#FFF4E8] border border-[#F0E6DF] p-3.5 space-y-2.5 text-[#5A4A42]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-[#5A4A42]">
            {t('nagara:whatsNewTitle')}
          </div>
          <div className="text-[11px] text-[#7A6A62]">
            {t('nagara:digestSubtitle', { role: roleLabel })}
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#F0E6DF] text-[#7A6A62] tabular-nums">
          {localizeDigits(
            t('nagara:itemsCount', { count: updates.length }),
            language,
            useNativeNumerals
          )}
        </span>
      </div>

      {updates.length === 0 ? (
        <p className="text-xs text-[#7A6A62]">{t('nagara:noUpdates')}</p>
      ) : (
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const { Icon, bg, color } = getDeptIcon(item.departmentId);
            const isHighlighted = newHighlightIds.has(item.id);
            const structuredSummary = formatDigestSummary(
              item,
              t,
              language,
              useNativeNumerals
            );
            const areaText =
              formatItemArea(item, language) ??
              (item.area.trim() === 'All Zones'
                ? t('common:allZones')
                : t('common:bengaluru'));
            const timeText = formatRelativeTimeText(
              item.timeAgo,
              t,
              language,
              useNativeNumerals
            );
            const periodText = item.period
              ? formatPeriodLabel(item.period, t, language, useNativeNumerals)
              : null;

            return (
              <li
                key={item.id}
                className={`rounded-xl bg-white border border-[#F0E6DF] p-2.5 flex items-start gap-2.5 transition-colors ${
                  isHighlighted
                    ? 'nagara-slide-in ring-2 ring-[#FF9B71]/45'
                    : ''
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg ${bg} ${color} inline-flex items-center justify-center shrink-0 mt-0.5`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-xs font-medium text-[#5A4A42] leading-snug">
                    {structuredSummary ?? (
                      <TranslatableText
                        text={item.summary}
                        autoTranslate={
                          item.category !== 'announcement' &&
                          item.category !== 'outage'
                        }
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#7A6A62]">
                    <span className="font-semibold text-[#5A4A42]">
                      {areaText}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{timeText}</span>
                    {periodText && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{periodText}</span>
                      </>
                    )}
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded-full border text-[10px] font-semibold ${getSourceBadgeClasses(
                        item.sourceBadge
                      )}`}
                    >
                      {getSourceBadgeLabel(item, t)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {updates.length > 6 && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-full py-1.5 rounded-xl bg-white/80 hover:bg-white border border-[#F0E6DF] text-xs font-semibold text-[#964825] inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
        >
          {expanded ? (
            <>
              <span>{t('nagara:showFewer')}</span>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            </>
          ) : (
            <>
              <span>
                {t('nagara:showAll', {
                  count: formatNumber(
                    updates.length,
                    language,
                    useNativeNumerals
                  ),
                })}
              </span>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </>
          )}
        </button>
      )}
    </div>
  );
};
