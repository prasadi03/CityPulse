import React, { useState } from 'react';
import {
  Zap,
  Droplets,
  TrafficCone,
  MapPin,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import {
  CitizenTab,
  ConsumptionMetric,
  UserSession,
} from '../types/citypulse';
import { DepartmentBadge, IssueStatusBadge } from './StatusPrimitives';
import { BengaluruHeatmapMap } from './BengaluruHeatmapMap';
import { TranslatableText } from './TranslatableText';
import { useAppLanguage } from '../i18n';
import {
  formatNumber,
  formatRelativeTimeText,
  getAreaLabel,
  getDepartmentLabel,
  getZoneLabel,
  localizeDigits,
} from '../i18n/formatters';

interface CitizenHomeProps {
  session: UserSession;
  onNavigateTab: (tab: CitizenTab, focusMetric?: ConsumptionMetric) => void;
}

export const CitizenHome: React.FC<CitizenHomeProps> = ({
  session,
  onNavigateTab,
}) => {
  const { language, useNativeNumerals, t } = useAppLanguage();
  const snapshot = dataService.getCitizenSnapshot(session);
  const areas = dataService.getAreas();
  const savedAreaId =
    session.role === 'citizen' || session.role === 'guest'
      ? session.areaId
      : '';

  const [pickingArea, setPickingArea] = useState(!savedAreaId);
  const [draftAreaId, setDraftAreaId] = useState(savedAreaId || 'indiranagar');
  const [homeMapMetric, setHomeMapMetric] =
    useState<ConsumptionMetric>('electricity');
  const [selectedMapAreaId, setSelectedMapAreaId] = useState<string | null>(
    savedAreaId || null
  );

  const myAreaMetric = savedAreaId
    ? snapshot.allMetrics.find((m) => m.area.id === savedAreaId) ?? null
    : null;

  const myAreaOpenIssues = savedAreaId
    ? dataService
        .getPublicIssues('all')
        .filter((i) => i.areaId === savedAreaId && i.status !== 'Solved').length
    : 0;

  const handleSaveMyArea = () => {
    dataService.setPreferredAreaId(draftAreaId);
    setSelectedMapAreaId(draftAreaId);
    setPickingArea(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Greeting */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#5A4A42]">
            {t('home:title')}
          </h1>
          <p className="text-sm text-[#7A6A62]">
            {localizeDigits(t('home:subtitle'), language, useNativeNumerals)}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('heatmap', homeMapMetric)}
          className="h-11 px-5 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-sm inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>{t('home:fullHeatmapBtn')}</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* City Snapshot: Electricity, Water, and Traffic Cards (click to switch live map!) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setHomeMapMetric('electricity')}
          className={`cp-card-interactive p-5 text-left bg-[#FFF8D6]/45 flex flex-col justify-between gap-3 cursor-pointer ${
            homeMapMetric === 'electricity' ? 'ring-2 ring-[#FFC93C]' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8A5D00]">
              <Zap className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t('common:metrics.electricity')}</span>
            </span>
            <span className="text-xs font-semibold text-[#8A5D00] text-right">
              {homeMapMetric === 'electricity'
                ? t('home:shownOnMap')
                : t('home:showOnMap')}
            </span>
          </div>
          <div className="text-3xl font-bold text-[#5A4A42] tabular-nums">
            {formatNumber(snapshot.totalElecMW, language, useNativeNumerals)}{' '}
            <span className="text-base font-semibold text-[#7A6A62]">MW</span>
          </div>
          <p className="text-xs text-[#7A6A62]">
            {localizeDigits(t('home:bescomCityLoad'), language, useNativeNumerals)}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setHomeMapMetric('water')}
          className={`cp-card-interactive p-5 text-left bg-[#E8F4FD]/50 flex flex-col justify-between gap-3 cursor-pointer ${
            homeMapMetric === 'water' ? 'ring-2 ring-[#5BB8F5]' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B4F78]">
              <Droplets className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t('common:metrics.water')}</span>
            </span>
            <span className="text-xs font-semibold text-[#0B4F78] text-right">
              {homeMapMetric === 'water'
                ? t('home:shownOnMap')
                : t('home:showOnMap')}
            </span>
          </div>
          <div className="text-3xl font-bold text-[#5A4A42] tabular-nums">
            {formatNumber(snapshot.totalWaterMLD, language, useNativeNumerals)}{' '}
            <span className="text-base font-semibold text-[#7A6A62]">MLD</span>
          </div>
          <p className="text-xs text-[#7A6A62]">{t('home:bwssbSupplyDraw')}</p>
        </button>

        <button
          type="button"
          onClick={() => setHomeMapMetric('traffic')}
          className={`cp-card-interactive p-5 text-left bg-[#FFF0E6]/55 flex flex-col justify-between gap-3 cursor-pointer ${
            homeMapMetric === 'traffic' ? 'ring-2 ring-[#FF9B71]' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#964825]">
              <TrafficCone className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t('common:metrics.traffic')}</span>
            </span>
            <span className="text-xs font-semibold text-[#964825] text-right">
              {homeMapMetric === 'traffic'
                ? t('home:shownOnMap')
                : t('home:showOnMap')}
            </span>
          </div>
          <div className="text-3xl font-bold text-[#5A4A42] tabular-nums">
            {formatNumber(snapshot.avgTrafficPct, language, useNativeNumerals)}
            <span className="text-base font-semibold text-[#7A6A62]">
              {t('home:trafficLoadSuffix')}
            </span>
          </div>
          <p className="text-xs text-[#7A6A62]">{t('home:trafficIndexDesc')}</p>
        </button>
      </div>

      {/* Live Bengaluru OpenStreetMap Heatmap synced with Electricity / Water / Traffic cards */}
      <BengaluruHeatmapMap
        heightClass="h-[360px]"
        metrics={snapshot.allMetrics}
        activeMetric={homeMapMetric}
        timeRange="now"
        zoneFilter="All"
        selectedAreaId={selectedMapAreaId}
        onSelectArea={(id) =>
          setSelectedMapAreaId((prev) => (prev === id ? null : id))
        }
        getAreaValue={(m) =>
          homeMapMetric === 'electricity'
            ? m.electricityNowMW
            : homeMapMetric === 'water'
            ? m.waterNowMLD
            : m.trafficNowPct
        }
        getAreaIntensity={(m) =>
          homeMapMetric === 'electricity'
            ? m.electricityIntensity
            : homeMapMetric === 'water'
            ? m.waterIntensity
            : m.trafficIntensity
        }
        unit={
          homeMapMetric === 'electricity'
            ? 'MW'
            : homeMapMetric === 'water'
            ? 'MLD'
            : '%'
        }
      />

      {/* My Area Card + Top 3 High-Usage Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* My Area Card */}
        <div className="lg:col-span-5 cp-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-base font-bold text-[#5A4A42]">
              <MapPin className="w-4 h-4 text-[#964825]" aria-hidden="true" />
              <span>{t('home:myAreaTitle')}</span>
            </div>
            {myAreaMetric && !pickingArea && (
              <button
                type="button"
                onClick={() => setPickingArea(true)}
                className="text-xs font-semibold text-[#964825] hover:underline cursor-pointer"
              >
                {t('common:actions.change')}
              </button>
            )}
          </div>

          {pickingArea || !myAreaMetric ? (
            <div className="space-y-3">
              <p className="text-sm text-[#7A6A62]">{t('home:myAreaPrompt')}</p>
              <select
                aria-label={t('home:myAreaAria')}
                value={draftAreaId}
                onChange={(e) => setDraftAreaId(e.target.value)}
                className="cp-input w-full px-4 cursor-pointer"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {getAreaLabel(a.id, language, a.name)} (
                    {t('common:zoneWithLabel', {
                      zone: getZoneLabel(a.zone, language),
                    })}
                    )
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSaveMyArea}
                className="w-full h-11 rounded-full bg-[#FF9B71] hover:bg-[#FF8456] text-[#5A4A42] font-semibold text-sm transition-colors cursor-pointer"
              >
                {t('home:pinMyArea')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xl font-bold text-[#5A4A42]">
                  {getAreaLabel(
                    myAreaMetric.area.id,
                    language,
                    myAreaMetric.area.name
                  )}
                </div>
                <div className="text-xs text-[#7A6A62]">
                  {t('common:zoneWithLabel', {
                    zone: getZoneLabel(myAreaMetric.area.zone, language),
                  })}{' '}
                  ·{' '}
                  {localizeDigits(
                    t('home:activeIssues', { count: myAreaOpenIssues }),
                    language,
                    useNativeNumerals
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl bg-[#FFF8D6]/55 p-3">
                  <div className="text-[11px] font-semibold text-[#8A5D00] truncate">
                    {t('common:metrics.electricity')}
                  </div>
                  <div className="text-base font-bold text-[#5A4A42] tabular-nums mt-0.5">
                    {formatNumber(
                      myAreaMetric.electricityNowMW,
                      language,
                      useNativeNumerals
                    )}{' '}
                    MW
                  </div>
                </div>

                <div className="rounded-xl bg-[#E8F4FD]/65 p-3">
                  <div className="text-[11px] font-semibold text-[#0B4F78] truncate">
                    {t('common:metrics.water')}
                  </div>
                  <div className="text-base font-bold text-[#5A4A42] tabular-nums mt-0.5">
                    {formatNumber(
                      myAreaMetric.waterNowMLD,
                      language,
                      useNativeNumerals
                    )}{' '}
                    MLD
                  </div>
                </div>

                <div className="rounded-xl bg-[#FFF0E6]/75 p-3">
                  <div className="text-[11px] font-semibold text-[#964825] truncate">
                    {t('common:metrics.traffic')}
                  </div>
                  <div className="text-base font-bold text-[#5A4A42] tabular-nums mt-0.5">
                    {formatNumber(
                      myAreaMetric.trafficNowPct,
                      language,
                      useNativeNumerals
                    )}
                    %
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top 3 High-Usage Areas */}
        <div className="lg:col-span-7 cp-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[#5A4A42] inline-flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#964825] shrink-0" aria-hidden="true" />
              <span>
                {localizeDigits(t('home:top3Title'), language, useNativeNumerals)}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('heatmap', homeMapMetric)}
              className="text-xs font-semibold text-[#964825] hover:underline whitespace-nowrap cursor-pointer"
            >
              {localizeDigits(t('home:seeAll30'), language, useNativeNumerals)}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#8A5D00]">
                {t('home:elecUnitTitle')}
              </div>
              <div className="divide-y divide-[#F5EDE6]">
                {snapshot.topElecAreas.map((m, idx) => (
                  <div
                    key={m.area.id}
                    className="py-2 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <span className="font-semibold text-[#5A4A42] truncate pr-2">
                      {formatNumber(idx + 1, language, useNativeNumerals)}.{' '}
                      {getAreaLabel(m.area.id, language, m.area.name)}
                    </span>
                    <span className="font-bold text-[#5A4A42] tabular-nums shrink-0">
                      {formatNumber(
                        m.electricityNowMW,
                        language,
                        useNativeNumerals
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#0B4F78]">
                {t('home:waterUnitTitle')}
              </div>
              <div className="divide-y divide-[#F5EDE6]">
                {snapshot.topWaterAreas.map((m, idx) => (
                  <div
                    key={m.area.id}
                    className="py-2 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <span className="font-semibold text-[#5A4A42] truncate pr-2">
                      {formatNumber(idx + 1, language, useNativeNumerals)}.{' '}
                      {getAreaLabel(m.area.id, language, m.area.name)}
                    </span>
                    <span className="font-bold text-[#5A4A42] tabular-nums shrink-0">
                      {formatNumber(
                        m.waterNowMLD,
                        language,
                        useNativeNumerals
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#964825]">
                {t('home:trafficUnitTitle')}
              </div>
              <div className="divide-y divide-[#F5EDE6]">
                {snapshot.topTrafficAreas.map((m, idx) => (
                  <div
                    key={m.area.id}
                    className="py-2 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <span className="font-semibold text-[#5A4A42] truncate pr-2">
                      {formatNumber(idx + 1, language, useNativeNumerals)}.{' '}
                      {getAreaLabel(m.area.id, language, m.area.name)}
                    </span>
                    <span className="font-bold text-[#5A4A42] tabular-nums shrink-0">
                      {formatNumber(
                        m.trafficNowPct,
                        language,
                        useNativeNumerals
                      )}
                      %
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Updates from All Departments */}
      <div className="cp-card p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#5A4A42]">
              {t('home:recentUpdatesTitle')}
            </h2>
            <p className="text-xs text-[#7A6A62]">
              {t('home:recentUpdatesSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('departments')}
            className="text-xs font-semibold text-[#964825] hover:underline whitespace-nowrap cursor-pointer"
          >
            {t('home:browseDepts')}
          </button>
        </div>

        <div className="divide-y divide-[#F5EDE6]">
          {snapshot.recentUpdates.map((issue) => (
            <div
              key={issue.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DepartmentBadge
                    departmentId={issue.departmentId}
                    label={getDepartmentLabel(issue.departmentId, t, true)}
                  />
                  <span className="text-xs text-[#7A6A62]">
                    {getAreaLabel(issue.areaId, language, issue.areaName)} ·{' '}
                    {formatRelativeTimeText(
                      issue.createdAt,
                      t,
                      language,
                      useNativeNumerals
                    )}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#5A4A42]">
                  <TranslatableText text={issue.title} autoTranslate />
                </div>
              </div>
              <IssueStatusBadge
                status={issue.status}
                scheduled={issue.scheduled}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
