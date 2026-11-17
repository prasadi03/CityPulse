import React from 'react';
import {
  Clock,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Zap,
  Droplets,
  TrafficCone,
  ArrowRight,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { UserSession, WorkerTab } from '../types/citypulse';
import {
  ErrorState,
  IssueStatusBadge,
  PriorityBadge,
} from './StatusPrimitives';
import { TranslatableText } from './TranslatableText';
import { useAppLanguage } from '../i18n';
import {
  formatNumber,
  getAreaLabel,
  getCategoryLabel,
  getDepartmentLabel,
  getZoneLabel,
  localizeDigits,
} from '../i18n/formatters';

interface WorkerDashboardProps {
  session: UserSession;
  onSelectIssue: (issueId: string) => void;
  onNavigateTab: (tab: WorkerTab) => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({
  session,
  onSelectIssue,
  onNavigateTab,
}) => {
  const { language, useNativeNumerals, t } = useAppLanguage();

  if (session.role !== 'worker') {
    return <ErrorState message={t('errors:unauthorizedWorker')} />;
  }

  const dash = dataService.getWorkerDashboard(session);
  const deptLabel = session.departmentId
    ? getDepartmentLabel(session.departmentId, t)
    : dash.department;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#5A4A42]">
            {t('worker:dashboardTitle', { department: deptLabel })}
          </h1>
          <p className="text-sm text-[#7A6A62]">
            {t('worker:dashboardSubtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('issues')}
          className="h-11 px-5 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <span>{t('worker:manageAllIssues')}</span>
          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
        </button>
      </div>

      {/* Issue Status Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cp-card p-5 bg-[#FFF8D6]/55">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A5D00]">
            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('common:status.waiting')}</span>
          </div>
          <div className="text-3xl font-bold text-[#5A4A42] mt-1 tabular-nums">
            {formatNumber(dash.waitingCount, language, useNativeNumerals)}
          </div>
          <div className="text-xs text-[#7A6A62]">
            {t('worker:awaitingCrew')}
          </div>
        </div>

        <div className="cp-card p-5 bg-[#E8F4FD]/60">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0B4F78]">
            <RefreshCw className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('common:status.ongoing')}</span>
          </div>
          <div className="text-3xl font-bold text-[#5A4A42] mt-1 tabular-nums">
            {formatNumber(dash.ongoingCount, language, useNativeNumerals)}
          </div>
          <div className="text-xs text-[#7A6A62]">
            {t('worker:activeScheduled')}
          </div>
        </div>

        <div className="cp-card p-5 bg-[#EAF8F0]/60">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D3B20]">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('common:status.solved')}</span>
          </div>
          <div className="text-3xl font-bold text-[#5A4A42] mt-1 tabular-nums">
            {formatNumber(dash.solvedCount, language, useNativeNumerals)}
          </div>
          <div className="text-xs text-[#7A6A62]">
            {t('worker:resolvedInDept')}
          </div>
        </div>

        <div className="cp-card p-5 bg-[#FFF0E6]/60">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#964825]">
            <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t('worker:todaysNew')}</span>
          </div>
          <div className="text-3xl font-bold text-[#5A4A42] mt-1 tabular-nums">
            {formatNumber(dash.todayNewCount, language, useNativeNumerals)}
          </div>
          <div className="text-xs text-[#7A6A62]">
            {localizeDigits(
              t('worker:reportedLast24h'),
              language,
              useNativeNumerals
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Oldest Unresolved + (High Consumption/Load for Electricity/Water/Traffic) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div
          className={`${
            dash.allowedMetric ? 'lg:col-span-7' : 'lg:col-span-12'
          } cp-card p-6 space-y-4`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[#5A4A42]">
              {t('worker:oldestUnresolved', { department: deptLabel })}
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('issues')}
              className="text-xs font-semibold text-[#964825] hover:underline cursor-pointer whitespace-nowrap"
            >
              {t('worker:openQueue')}
            </button>
          </div>

          <div className="divide-y divide-[#F5EDE6]">
            {dash.oldestUnresolved.length === 0 ? (
              <p className="py-6 text-sm text-[#7A6A62]">
                {t('worker:allSolved', { department: deptLabel })}
              </p>
            ) : (
              dash.oldestUnresolved.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => onSelectIssue(issue.id)}
                  className="w-full text-left py-3.5 px-2.5 -mx-2 rounded-xl hover:bg-[#FFF9F2] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#7A6A62] tabular-nums">
                        {issue.id}
                      </span>
                      <PriorityBadge priority={issue.priority} />
                      <span className="text-xs font-semibold text-[#964825] tabular-nums">
                        {localizeDigits(
                          t('common:relativeTime.hoursOld', {
                            count: issue.ageHours,
                          }),
                          language,
                          useNativeNumerals
                        )}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-[#5A4A42]">
                      <TranslatableText text={issue.title} autoTranslate />
                    </div>
                    <div className="text-xs text-[#7A6A62]">
                      {getAreaLabel(issue.areaId, language, issue.areaName)} (
                      {getZoneLabel(issue.zone, language)}) ·{' '}
                      {getCategoryLabel(issue.category, t)}
                    </div>
                  </div>
                  <IssueStatusBadge
                    status={issue.status}
                    scheduled={issue.scheduled}
                  />
                </button>
              ))
            )}
          </div>
        </div>

        {/* High Consumption / Load Areas (ONLY for Electricity, Water, and Traffic departments) */}
        {dash.allowedMetric && (
          <div className="lg:col-span-5 cp-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-base font-bold text-[#5A4A42]">
                {dash.allowedMetric === 'electricity' ? (
                  <Zap className="w-4 h-4 text-[#D49A00] shrink-0" aria-hidden="true" />
                ) : dash.allowedMetric === 'water' ? (
                  <Droplets className="w-4 h-4 text-[#0B4F78] shrink-0" aria-hidden="true" />
                ) : (
                  <TrafficCone className="w-4 h-4 text-[#964825] shrink-0" aria-hidden="true" />
                )}
                <span>
                  {dash.allowedMetric === 'electricity'
                    ? t('worker:highElecAreas')
                    : dash.allowedMetric === 'water'
                    ? t('worker:highWaterAreas')
                    : t('worker:peakTrafficAreas')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('data')}
                className="text-xs font-semibold text-[#964825] hover:underline cursor-pointer whitespace-nowrap"
              >
                {t('worker:openMapData')}
              </button>
            </div>

            <div className="divide-y divide-[#F5EDE6]">
              {dash.highConsumptionAreas.map((m, idx) => {
                const val =
                  dash.allowedMetric === 'electricity'
                    ? `${formatNumber(
                        m.electricityNowMW,
                        language,
                        useNativeNumerals
                      )} MW`
                    : dash.allowedMetric === 'water'
                    ? `${formatNumber(
                        m.waterNowMLD,
                        language,
                        useNativeNumerals
                      )} MLD`
                    : `${formatNumber(
                        m.trafficNowPct,
                        language,
                        useNativeNumerals
                      )}${t('home:trafficLoadSuffix')}`;
                const intensity =
                  dash.allowedMetric === 'electricity'
                    ? m.electricityIntensity
                    : dash.allowedMetric === 'water'
                    ? m.waterIntensity
                    : m.trafficIntensity;

                return (
                  <div
                    key={m.area.id}
                    className="py-3 flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-[#5A4A42] truncate">
                        {formatNumber(idx + 1, language, useNativeNumerals)}.{' '}
                        {getAreaLabel(m.area.id, language, m.area.name)}
                      </div>
                      <div className="text-xs text-[#7A6A62]">
                        {t('common:zoneWithLabel', {
                          zone: getZoneLabel(m.area.zone, language),
                        })}{' '}
                        ·{' '}
                        {localizeDigits(
                          t('heatmap:intensityScore', { value: intensity }),
                          language,
                          useNativeNumerals
                        )}
                      </div>
                    </div>
                    <div className="font-bold text-[#5A4A42] tabular-nums shrink-0">
                      {val}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
