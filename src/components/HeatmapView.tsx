import React, { useMemo, useState } from 'react';
import {
  Search,
  Zap,
  Droplets,
  TrafficCone,
  Flame,
  TrendingUp,
  ArrowUpDown,
  X,
} from 'lucide-react';
import {
  ComputedAreaMetric,
  ConsumptionMetric,
  HeatmapDisplayMode,
  TimeRange,
  Zone,
} from '../types/citypulse';
import { EmptyState } from './StatusPrimitives';
import { BengaluruHeatmapMap } from './BengaluruHeatmapMap';
import { useAppLanguage } from '../i18n';
import {
  areaMatchesSearch,
  formatHourLabel,
  formatNumber,
  getAreaLabel,
  getZoneLabel,
  localizeDigits,
} from '../i18n/formatters';

interface HeatmapViewProps {
  metrics: ComputedAreaMetric[];
  lockedMetric?: ConsumptionMetric;
  initialMetric?: ConsumptionMetric;
  title?: string;
  subtitle?: string;
}

const ZONES: ('All' | Zone)[] = ['All', 'North', 'South', 'East', 'West', 'Central'];

type MatrixSortKey = 'name' | 'total' | 'peak' | 'change';

function getIntensityBand(intensity: number): {
  tierKey: 'bandLow' | 'bandModerate' | 'bandHigh' | 'bandVeryHigh';
  bg: string;
  border: string;
  text: string;
  isHigh: boolean;
  isVeryHigh: boolean;
} {
  if (intensity >= 83) {
    return {
      tierKey: 'bandVeryHigh',
      bg: '#FF8B7B',
      border: '#FF6B6B',
      text: '#5A4A42',
      isHigh: true,
      isVeryHigh: true,
    };
  }
  if (intensity >= 65) {
    return {
      tierKey: 'bandHigh',
      bg: '#FFC49B',
      border: '#FF9B71',
      text: '#5A4A42',
      isHigh: true,
      isVeryHigh: false,
    };
  }
  if (intensity >= 40) {
    return {
      tierKey: 'bandModerate',
      bg: '#FFF0A8',
      border: '#F3DC75',
      text: '#5A4A42',
      isHigh: false,
      isVeryHigh: false,
    };
  }
  return {
    tierKey: 'bandLow',
    bg: '#FFFBF2',
    border: '#F0E6DF',
    text: '#5A4A42',
    isHigh: false,
    isVeryHigh: false,
  };
}

export const HeatmapView: React.FC<HeatmapViewProps> = ({
  metrics,
  lockedMetric,
  initialMetric,
  title,
  subtitle,
}) => {
  const { language, useNativeNumerals, t } = useAppLanguage();
  const resolvedTitle = title ?? t('heatmap:title');
  const resolvedSubtitle =
    subtitle ?? localizeDigits(t('heatmap:subtitle'), language, useNativeNumerals);

  const [metric, setMetric] = useState<ConsumptionMetric>(
    lockedMetric ?? initialMetric ?? 'electricity'
  );
  const [timeRange, setTimeRange] = useState<TimeRange>('now');
  const [displayMode, setDisplayMode] = useState<HeatmapDisplayMode>('map');
  const [zoneFilter, setZoneFilter] = useState<'All' | Zone>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [hoveredAreaId, setHoveredAreaId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<MatrixSortKey>('total');
  const [sortAsc, setSortAsc] = useState(false);

  React.useEffect(() => {
    if (initialMetric && !lockedMetric) {
      setMetric(initialMetric);
    }
  }, [initialMetric, lockedMetric]);

  const activeMetric: ConsumptionMetric = lockedMetric ?? metric;
  const unit =
    activeMetric === 'electricity'
      ? 'MW'
      : activeMetric === 'water'
      ? 'MLD'
      : '%';

  const getValueForRange = (m: ComputedAreaMetric): number => {
    if (activeMetric === 'electricity') {
      if (timeRange === 'now') return m.electricityNowMW;
      if (timeRange === '24h') return m.electricity24hAvgMW;
      return m.electricity7dAvgMW;
    }
    if (activeMetric === 'water') {
      if (timeRange === 'now') return m.waterNowMLD;
      if (timeRange === '24h') return m.water24hAvgMLD;
      return m.water7dAvgMLD;
    }
    if (timeRange === 'now') return m.trafficNowPct;
    if (timeRange === '24h') return m.traffic24hAvgPct;
    return m.traffic7dAvgPct;
  };

  const getIntensityForArea = (m: ComputedAreaMetric): number => {
    const base =
      activeMetric === 'electricity'
        ? m.electricityIntensity
        : activeMetric === 'water'
        ? m.waterIntensity
        : m.trafficIntensity;
    if (timeRange === 'now') {
      const pct =
        activeMetric === 'electricity'
          ? m.electricityPctVsAvg
          : activeMetric === 'water'
          ? m.waterPctVsAvg
          : m.trafficPctVsAvg;
      return Math.min(99, Math.max(12, Math.round(base + pct * 0.35)));
    }
    if (timeRange === '7d') {
      return Math.min(98, Math.max(15, base - 2));
    }
    return base;
  };

  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      if (zoneFilter !== 'All' && m.area.zone !== zoneFilter) return false;
      if (searchQuery.trim() && !areaMatchesSearch(m.area.id, searchQuery)) {
        return false;
      }
      return true;
    });
  }, [metrics, zoneFilter, searchQuery]);

  const summaryStats = useMemo(() => {
    const source = filteredMetrics.length > 0 ? filteredMetrics : metrics;
    const totalRaw = source.reduce((sum, m) => sum + getValueForRange(m), 0);
    const total =
      activeMetric === 'traffic'
        ? Math.round(totalRaw / Math.max(1, source.length))
        : Number(totalRaw.toFixed(1));

    const sorted = [...source].sort(
      (a, b) => getValueForRange(b) - getValueForRange(a)
    );
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    const hourlyTotals = Array.from({ length: 24 }, (_, hr) =>
      source.reduce(
        (sum, m) =>
          sum +
          (activeMetric === 'electricity'
            ? m.electricityHourly[hr]
            : activeMetric === 'water'
            ? m.waterHourly[hr]
            : m.trafficHourly[hr]),
        0
      )
    );
    const maxHourVal = Math.max(...hourlyTotals);
    const peakHour = hourlyTotals.indexOf(maxHourVal);

    return { total, highest, lowest, peakHour };
  }, [filteredMetrics, metrics, activeMetric, timeRange]);

  const groupedByZone = useMemo(() => {
    const zonesOrder: Zone[] = ['North', 'South', 'East', 'West', 'Central'];
    return zonesOrder
      .map((z) => ({
        zone: z,
        items: filteredMetrics.filter((m) => m.area.zone === z),
      }))
      .filter((g) => g.items.length > 0);
  }, [filteredMetrics]);

  const sortedMatrixRows = useMemo(() => {
    const list = [...filteredMetrics];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = getAreaLabel(a.area.id, language, a.area.name).localeCompare(
          getAreaLabel(b.area.id, language, b.area.name)
        );
      } else if (sortBy === 'total') {
        const aSum =
          activeMetric === 'electricity'
            ? a.electricityHourly.reduce((s, v) => s + v, 0)
            : activeMetric === 'water'
            ? a.waterHourly.reduce((s, v) => s + v, 0)
            : a.trafficHourly.reduce((s, v) => s + v, 0);
        const bSum =
          activeMetric === 'electricity'
            ? b.electricityHourly.reduce((s, v) => s + v, 0)
            : activeMetric === 'water'
            ? b.waterHourly.reduce((s, v) => s + v, 0)
            : b.trafficHourly.reduce((s, v) => s + v, 0);
        cmp = aSum - bSum;
      } else if (sortBy === 'peak') {
        const aPeak =
          activeMetric === 'electricity'
            ? a.electricityPeakMW
            : activeMetric === 'water'
            ? a.waterPeakMLD
            : a.trafficPeakPct;
        const bPeak =
          activeMetric === 'electricity'
            ? b.electricityPeakMW
            : activeMetric === 'water'
            ? b.waterPeakMLD
            : b.trafficPeakPct;
        cmp = aPeak - bPeak;
      } else {
        const aChg =
          activeMetric === 'electricity'
            ? a.electricityPctVsAvg
            : activeMetric === 'water'
            ? a.waterPctVsAvg
            : a.trafficPctVsAvg;
        const bChg =
          activeMetric === 'electricity'
            ? b.electricityPctVsAvg
            : activeMetric === 'water'
            ? b.waterPctVsAvg
            : b.trafficPctVsAvg;
        cmp = aChg - bChg;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [filteredMetrics, sortBy, sortAsc, activeMetric, language]);

  const activeDetailId = selectedAreaId ?? hoveredAreaId;
  const detailArea =
    metrics.find((m) => m.area.id === activeDetailId) ?? null;

  const handleSortClick = (key: MatrixSortKey) => {
    if (sortBy === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(key);
      setSortAsc(key === 'name');
    }
  };

  const matrixCellMax = useMemo(() => {
    let maxVal = 1;
    metrics.forEach((m) => {
      const series =
        timeRange === '7d'
          ? activeMetric === 'electricity'
            ? m.electricityDaily7d
            : activeMetric === 'water'
            ? m.waterDaily7d
            : m.trafficDaily7d
          : activeMetric === 'electricity'
          ? m.electricityHourly
          : activeMetric === 'water'
          ? m.waterHourly
          : m.trafficHourly;
      series.forEach((v) => {
        if (v > maxVal) maxVal = v;
      });
    });
    return maxVal;
  }, [metrics, activeMetric, timeRange]);

  const matrixColumns =
    timeRange === '7d'
      ? [
          localizeDigits(t('heatmap:daysShort.d6'), language, useNativeNumerals),
          localizeDigits(t('heatmap:daysShort.d5'), language, useNativeNumerals),
          localizeDigits(t('heatmap:daysShort.d4'), language, useNativeNumerals),
          localizeDigits(t('heatmap:daysShort.d3'), language, useNativeNumerals),
          localizeDigits(t('heatmap:daysShort.d2'), language, useNativeNumerals),
          t('heatmap:daysShort.yest'),
          t('heatmap:daysShort.today'),
        ]
      : Array.from({ length: 24 }, (_, i) =>
          localizeDigits(String(i).padStart(2, '0'), language, useNativeNumerals)
        );

  const periodLabel =
    timeRange === 'now'
      ? t('heatmap:periodLive')
      : localizeDigits(
          timeRange === '24h' ? t('heatmap:time24h') : t('heatmap:time7d'),
          language,
          useNativeNumerals
        );

  return (
    <div className="space-y-5">
      {/* Header & Top Toggles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#5A4A42]">{resolvedTitle}</h1>
          <p className="text-sm text-[#7A6A62] mt-0.5">{resolvedSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Electricity | Water | Traffic Toggle */}
          {lockedMetric ? (
            <div className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white border border-[#F0E6DF] text-sm font-semibold text-[#5A4A42]">
              {lockedMetric === 'electricity' ? (
                <Zap className="w-4 h-4 text-[#D49A00]" aria-hidden="true" />
              ) : lockedMetric === 'water' ? (
                <Droplets className="w-4 h-4 text-[#0B4F78]" aria-hidden="true" />
              ) : (
                <TrafficCone className="w-4 h-4 text-[#964825]" aria-hidden="true" />
              )}
              <span>
                {lockedMetric === 'electricity'
                  ? t('heatmap:lockedElectricity')
                  : lockedMetric === 'water'
                  ? t('heatmap:lockedWater')
                  : t('heatmap:lockedTraffic')}
              </span>
            </div>
          ) : (
            <div
              className="inline-flex flex-wrap items-center p-1 rounded-full bg-white border border-[#F0E6DF]"
              role="group"
              aria-label={t('heatmap:metricToggleAria')}
            >
              <button
                type="button"
                onClick={() => setMetric('electricity')}
                className={`h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeMetric === 'electricity'
                    ? 'bg-[#FFC93C] text-[#5A4A42]'
                    : 'text-[#7A6A62] hover:text-[#5A4A42]'
                }`}
              >
                <Zap className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t('common:metrics.electricity')}</span>
              </button>
              <button
                type="button"
                onClick={() => setMetric('water')}
                className={`h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeMetric === 'water'
                    ? 'bg-[#5BB8F5] text-[#0B3552]'
                    : 'text-[#7A6A62] hover:text-[#5A4A42]'
                }`}
              >
                <Droplets className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t('common:metrics.water')}</span>
              </button>
              <button
                type="button"
                onClick={() => setMetric('traffic')}
                className={`h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeMetric === 'traffic'
                    ? 'bg-[#FF9B71] text-[#5A4A42]'
                    : 'text-[#7A6A62] hover:text-[#5A4A42]'
                }`}
              >
                <TrafficCone className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t('common:metrics.traffic')}</span>
              </button>
            </div>
          )}

          {/* 2. Now | 24h | 7d Toggle */}
          <div
            className="inline-flex items-center p-1 rounded-full bg-white border border-[#F0E6DF]"
            role="group"
            aria-label={t('heatmap:timeframeAria')}
          >
            {(['now', '24h', '7d'] as TimeRange[]).map((tr) => (
              <button
                key={tr}
                type="button"
                onClick={() => setTimeRange(tr)}
                className={`h-9 px-3 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                  timeRange === tr
                    ? 'bg-[#FF9B71] text-[#5A4A42]'
                    : 'text-[#7A6A62] hover:text-[#5A4A42]'
                }`}
              >
                {tr === 'now'
                  ? t('heatmap:timeNow')
                  : localizeDigits(
                      tr === '24h' ? t('heatmap:time24h') : t('heatmap:time7d'),
                      language,
                      useNativeNumerals
                    )}
              </button>
            ))}
          </div>

          {/* 3. Map | Grid | Matrix Toggle */}
          <div
            className="inline-flex items-center p-1 rounded-full bg-white border border-[#F0E6DF]"
            role="group"
            aria-label={t('heatmap:viewModeAria')}
          >
            {(
              [
                { id: 'map', label: t('heatmap:modeMap') },
                { id: 'grid', label: t('heatmap:modeGrid') },
                { id: 'matrix', label: t('heatmap:modeMatrix') },
              ] as { id: HeatmapDisplayMode; label: string }[]
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setDisplayMode(mode.id)}
                className={`h-9 px-3.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                  displayMode === mode.id
                    ? 'bg-[#FFF0E6] text-[#5A4A42] border border-[#FF9B71]/40'
                    : 'text-[#7A6A62] hover:text-[#5A4A42]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cp-card p-4">
          <div className="text-xs font-semibold text-[#7A6A62]">
            {activeMetric === 'traffic'
              ? t('heatmap:avgCongestion', { period: periodLabel })
              : t('heatmap:totalConsumption', { period: periodLabel })}
          </div>
          <div className="text-2xl font-bold text-[#5A4A42] mt-1 tabular-nums">
            {formatNumber(summaryStats.total, language, useNativeNumerals)}{' '}
            <span className="text-sm font-semibold text-[#7A6A62]">{unit}</span>
          </div>
        </div>

        <div className="cp-card p-4 bg-[#FFF0E6]/45">
          <div className="text-xs font-semibold text-[#7A6A62]">
            {activeMetric === 'traffic'
              ? t('heatmap:heaviestTraffic')
              : t('heatmap:highestArea')}
          </div>
          <div className="text-base font-bold text-[#5A4A42] mt-1 truncate">
            {summaryStats.highest
              ? getAreaLabel(
                  summaryStats.highest.area.id,
                  language,
                  summaryStats.highest.area.name
                )
              : '—'}
          </div>
          <div className="text-sm font-semibold text-[#964825] tabular-nums">
            {summaryStats.highest
              ? `${formatNumber(
                  getValueForRange(summaryStats.highest),
                  language,
                  useNativeNumerals
                )} ${unit}`
              : '—'}
          </div>
        </div>

        <div className="cp-card p-4 bg-[#EAF8F0]/45">
          <div className="text-xs font-semibold text-[#7A6A62]">
            {activeMetric === 'traffic'
              ? t('heatmap:smoothestArea')
              : t('heatmap:lowestArea')}
          </div>
          <div className="text-base font-bold text-[#5A4A42] mt-1 truncate">
            {summaryStats.lowest
              ? getAreaLabel(
                  summaryStats.lowest.area.id,
                  language,
                  summaryStats.lowest.area.name
                )
              : '—'}
          </div>
          <div className="text-sm font-semibold text-[#0D3B20] tabular-nums">
            {summaryStats.lowest
              ? `${formatNumber(
                  getValueForRange(summaryStats.lowest),
                  language,
                  useNativeNumerals
                )} ${unit}`
              : '—'}
          </div>
        </div>

        <div className="cp-card p-4 bg-[#FFF8D6]/55">
          <div className="text-xs font-semibold text-[#7A6A62]">
            {t('heatmap:cityPeakHour')}
          </div>
          <div className="text-2xl font-bold text-[#5A4A42] mt-1 tabular-nums">
            {formatHourLabel(summaryStats.peakHour, language, useNativeNumerals)}
          </div>
        </div>
      </div>

      {/* Search, Zone Chips & Color Legend */}
      <div className="cp-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="group"
            aria-label={t('heatmap:zonesAria')}
          >
            {ZONES.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => {
                  setZoneFilter(z);
                  setSelectedAreaId(null);
                }}
                className={`h-9 px-3.5 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  zoneFilter === z
                    ? 'bg-[#FF9B71] text-[#5A4A42]'
                    : 'bg-[#FFF9F2] border border-[#F0E6DF] text-[#7A6A62] hover:bg-[#FFF0E6]'
                }`}
              >
                {z === 'All'
                  ? localizeDigits(
                      t('heatmap:allZonesCount'),
                      language,
                      useNativeNumerals
                    )
                  : getZoneLabel(z, language)}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search
              className="w-4 h-4 text-[#9C8B82] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('heatmap:searchPlaceholder')}
              className="cp-input w-full pl-10 pr-3 text-sm"
            />
          </div>
        </div>

        {/* Friendly Legend with Non-Color Icons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F5EDE6] text-xs text-[#5A4A42]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-semibold text-[#7A6A62]">
              {t('heatmap:legendLabel')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-[#FFFBF2] border border-[#F0E6DF]" />
              {t('heatmap:bandLow')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-[#FFF0A8] border border-[#F3DC75]" />
              {t('heatmap:bandModerate')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-[#FFC49B] border border-[#FF9B71] inline-flex items-center justify-center">
                <TrendingUp className="w-2.5 h-2.5 text-[#5A4A42]" aria-hidden="true" />
              </span>
              {t('heatmap:bandHigh')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-[#FF8B7B] border border-[#FF6B6B] inline-flex items-center justify-center">
                <Flame className="w-2.5 h-2.5 text-[#5A4A42]" aria-hidden="true" />
              </span>
              {t('heatmap:bandVeryHigh')}
            </span>
          </div>
          <span className="text-[#7A6A62]">
            {localizeDigits(
              displayMode === 'map'
                ? t('heatmap:hintMap')
                : displayMode === 'grid'
                ? t('heatmap:hintGrid')
                : t('heatmap:hintMatrix'),
              language,
              useNativeNumerals
            )}
          </span>
        </div>
      </div>

      {/* Empty Search Guard */}
      {filteredMetrics.length === 0 ? (
        <EmptyState
          title={t('heatmap:emptyTitle')}
          description={t('heatmap:emptyDesc')}
          actionLabel={t('common:actions.resetFilters')}
          onAction={() => {
            setZoneFilter('All');
            setSearchQuery('');
          }}
        />
      ) : displayMode === 'map' ? (
        /* VIEW 0: ACTUAL BENGALURU OPENSTREETMAP HEATMAP + DETAIL CARD */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8">
            <BengaluruHeatmapMap
              metrics={filteredMetrics}
              activeMetric={activeMetric}
              timeRange={timeRange}
              zoneFilter={zoneFilter}
              selectedAreaId={selectedAreaId}
              onSelectArea={(id) =>
                setSelectedAreaId((prev) => (prev === id ? null : id))
              }
              getAreaValue={getValueForRange}
              getAreaIntensity={getIntensityForArea}
              unit={unit}
            />
          </div>

          <div className="lg:col-span-4 space-y-4">
            {detailArea ? (
              <AreaDetailCard
                metricData={detailArea}
                activeMetric={activeMetric}
                unit={unit}
                val={getValueForRange(detailArea)}
                intensity={getIntensityForArea(detailArea)}
                onClear={() => setSelectedAreaId(null)}
              />
            ) : (
              <div className="cp-card p-5 space-y-3">
                <h2 className="text-base font-bold text-[#5A4A42]">
                  {t('heatmap:topAreasTitle')}
                </h2>
                <p className="text-xs text-[#7A6A62]">
                  {localizeDigits(
                    t('heatmap:topAreasSubtitle'),
                    language,
                    useNativeNumerals
                  )}
                </p>
                <div className="divide-y divide-[#F5EDE6]">
                  {[...filteredMetrics]
                    .sort((a, b) => getValueForRange(b) - getValueForRange(a))
                    .slice(0, 6)
                    .map((m) => (
                      <button
                        key={m.area.id}
                        type="button"
                        onClick={() => setSelectedAreaId(m.area.id)}
                        className="w-full py-2.5 px-2 -mx-1 rounded-xl hover:bg-[#FFF9F2] text-left flex items-center justify-between text-sm cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-[#5A4A42] truncate">
                            {getAreaLabel(m.area.id, language, m.area.name)}
                          </div>
                          <div className="text-xs text-[#7A6A62]">
                            {t('common:zoneWithLabel', {
                              zone: getZoneLabel(m.area.zone, language),
                            })}{' '}
                            ·{' '}
                            {localizeDigits(
                              t('heatmap:intensityScore', {
                                value: getIntensityForArea(m),
                              }),
                              language,
                              useNativeNumerals
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-[#5A4A42] tabular-nums shrink-0">
                          {formatNumber(
                            getValueForRange(m),
                            language,
                            useNativeNumerals
                          )}{' '}
                          {unit}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : displayMode === 'grid' ? (
        /* VIEW A: AREA TILE GRID */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 space-y-5">
            {groupedByZone.map((group) => (
              <div key={group.zone} className="cp-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#5A4A42]">
                    {t('common:zoneWithLabel', {
                      zone: getZoneLabel(group.zone, language),
                    })}
                  </h2>
                  <span className="text-xs font-semibold text-[#7A6A62]">
                    {localizeDigits(
                      t('heatmap:areasCount', { count: group.items.length }),
                      language,
                      useNativeNumerals
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {group.items.map((m) => {
                    const val = getValueForRange(m);
                    const intensity = getIntensityForArea(m);
                    const band = getIntensityBand(intensity);
                    const isSelected = selectedAreaId === m.area.id;
                    const areaName = getAreaLabel(
                      m.area.id,
                      language,
                      m.area.name
                    );
                    const tierLabel = t(`heatmap:${band.tierKey}`);

                    return (
                      <button
                        key={m.area.id}
                        type="button"
                        onClick={() =>
                          setSelectedAreaId(isSelected ? null : m.area.id)
                        }
                        onMouseEnter={() => setHoveredAreaId(m.area.id)}
                        onMouseLeave={() => setHoveredAreaId(null)}
                        aria-label={localizeDigits(
                          t('heatmap:tileAria', {
                            area: areaName,
                            value: val,
                            unit,
                            tier: tierLabel,
                          }),
                          language,
                          useNativeNumerals
                        )}
                        className={`rounded-2xl p-3.5 text-left transition-transform cursor-pointer flex flex-col justify-between min-h-[104px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9B71] ${
                          isSelected
                            ? 'ring-2 ring-[#5A4A42] -translate-y-0.5'
                            : 'hover:-translate-y-0.5'
                        }`}
                        style={{
                          backgroundColor: band.bg,
                          border: `1px solid ${band.border}`,
                          color: band.text,
                        }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-sm font-bold leading-snug text-[#5A4A42]">
                            {areaName}
                          </span>
                          {band.isVeryHigh ? (
                            <Flame
                              className="w-4 h-4 text-[#5A4A42] shrink-0"
                              aria-label={t('heatmap:veryHighDemandAria')}
                            />
                          ) : band.isHigh ? (
                            <TrendingUp
                              className="w-4 h-4 text-[#5A4A42] shrink-0"
                              aria-label={t('heatmap:highDemandAria')}
                            />
                          ) : null}
                        </div>

                        <div className="pt-2">
                          <div className="text-lg font-bold text-[#5A4A42] tabular-nums">
                            {formatNumber(val, language, useNativeNumerals)}{' '}
                            <span className="text-xs font-semibold">{unit}</span>
                          </div>
                          <div className="text-[11px] font-semibold text-[#5A4A42]/80">
                            {tierLabel} ·{' '}
                            {formatNumber(intensity, language, useNativeNumerals)}/
                            {formatNumber(100, language, useNativeNumerals)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-20">
            {detailArea ? (
              <AreaDetailCard
                metricData={detailArea}
                activeMetric={activeMetric}
                unit={unit}
                val={getValueForRange(detailArea)}
                intensity={getIntensityForArea(detailArea)}
                onClear={
                  selectedAreaId ? () => setSelectedAreaId(null) : undefined
                }
              />
            ) : (
              <div className="cp-card p-6 text-center space-y-2">
                <p className="text-base font-semibold text-[#5A4A42]">
                  {t('heatmap:detailPromptTitle')}
                </p>
                <p className="text-sm text-[#7A6A62]">
                  {localizeDigits(
                    t('heatmap:detailPromptDesc'),
                    language,
                    useNativeNumerals
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW B: TIME MATRIX */
        <div className="cp-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#5A4A42]">
              {localizeDigits(
                timeRange === '7d'
                  ? t('heatmap:matrixTitle7d')
                  : t('heatmap:matrixTitle24h'),
                language,
                useNativeNumerals
              )}
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-[#7A6A62]">
                {t('heatmap:sortRows')}
              </span>
              {(
                [
                  { id: 'total', label: t('heatmap:sortTotal') },
                  { id: 'peak', label: t('heatmap:sortPeak') },
                  { id: 'change', label: t('heatmap:sortChange') },
                  { id: 'name', label: t('heatmap:sortArea') },
                ] as { id: MatrixSortKey; label: string }[]
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSortClick(s.id)}
                  className={`h-8 px-3 rounded-full font-semibold inline-flex items-center gap-1 border cursor-pointer ${
                    sortBy === s.id
                      ? 'bg-[#FFF0E6] border-[#FF9B71] text-[#5A4A42]'
                      : 'bg-white border-[#F0E6DF] text-[#7A6A62]'
                  }`}
                >
                  <span>{s.label}</span>
                  <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#F5EDE6] text-[#7A6A62]">
                  <th className="py-2 pr-3 text-left font-semibold sticky left-0 bg-white min-w-[140px]">
                    {t('heatmap:colArea')}
                  </th>
                  <th className="py-2 px-2 text-right font-semibold whitespace-nowrap">
                    {t('heatmap:colPeak', { unit })}
                  </th>
                  {matrixColumns.map((col, colIdx) => (
                    <th
                      key={colIdx}
                      className="py-2 px-0.5 text-center font-medium tabular-nums min-w-[26px]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5EDE6]">
                {sortedMatrixRows.map((m) => {
                  const series =
                    timeRange === '7d'
                      ? activeMetric === 'electricity'
                        ? m.electricityDaily7d
                        : m.waterDaily7d
                      : activeMetric === 'electricity'
                      ? m.electricityHourly
                      : activeMetric === 'water'
                      ? m.waterHourly
                      : m.trafficHourly;
                  const finalSeries =
                    timeRange === '7d' && activeMetric === 'traffic'
                      ? m.trafficDaily7d
                      : series;
                  const peakVal =
                    activeMetric === 'electricity'
                      ? m.electricityPeakMW
                      : activeMetric === 'water'
                      ? m.waterPeakMLD
                      : m.trafficPeakPct;
                  const areaName = getAreaLabel(
                    m.area.id,
                    language,
                    m.area.name
                  );

                  return (
                    <tr
                      key={m.area.id}
                      onClick={() => setSelectedAreaId(m.area.id)}
                      className="hover:bg-[#FFF9F2] cursor-pointer"
                    >
                      <td className="py-2 pr-3 font-semibold text-[#5A4A42] sticky left-0 bg-white whitespace-nowrap">
                        {areaName}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-[#5A4A42] tabular-nums whitespace-nowrap">
                        {formatNumber(peakVal, language, useNativeNumerals)}
                      </td>
                      {finalSeries.map((val, cIdx) => {
                        const norm = Math.round((val / matrixCellMax) * 100);
                        const band = getIntensityBand(norm);
                        const formattedCellVal = formatNumber(
                          val,
                          language,
                          useNativeNumerals
                        );
                        return (
                          <td key={cIdx} className="p-0.5">
                            <div
                              title={`${areaName} (${matrixColumns[cIdx]}): ${formattedCellVal} ${unit} · ${t(`heatmap:${band.tierKey}`)}`}
                              className="h-6 rounded flex items-center justify-center font-bold text-[10px]"
                              style={{
                                backgroundColor: band.bg,
                                border: `1px solid ${band.border}`,
                                color: '#5A4A42',
                              }}
                            >
                              {band.isVeryHigh ? '▲' : ''}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {detailArea && (
            <div className="pt-2">
              <AreaDetailCard
                metricData={detailArea}
                activeMetric={activeMetric}
                unit={unit}
                val={getValueForRange(detailArea)}
                intensity={getIntensityForArea(detailArea)}
                onClear={() => setSelectedAreaId(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AreaDetailCard: React.FC<{
  metricData: ComputedAreaMetric;
  activeMetric: ConsumptionMetric;
  unit: string;
  val: number;
  intensity: number;
  onClear?: () => void;
}> = ({ metricData, activeMetric, unit, val, intensity, onClear }) => {
  const { language, useNativeNumerals, t } = useAppLanguage();
  const pct =
    activeMetric === 'electricity'
      ? metricData.electricityPctVsAvg
      : activeMetric === 'water'
      ? metricData.waterPctVsAvg
      : metricData.trafficPctVsAvg;
  const peakHr =
    activeMetric === 'electricity'
      ? metricData.electricityPeakHour
      : activeMetric === 'water'
      ? metricData.waterPeakHour
      : metricData.trafficPeakHour;
  const peakVal =
    activeMetric === 'electricity'
      ? metricData.electricityPeakMW
      : activeMetric === 'water'
      ? metricData.waterPeakMLD
      : metricData.trafficPeakPct;
  const hourly =
    activeMetric === 'electricity'
      ? metricData.electricityHourly
      : activeMetric === 'water'
      ? metricData.waterHourly
      : metricData.trafficHourly;
  const band = getIntensityBand(intensity);
  const areaName = getAreaLabel(
    metricData.area.id,
    language,
    metricData.area.name
  );

  const w = 280;
  const h = 76;
  const pad = 6;
  const min = Math.min(...hourly);
  const max = Math.max(...hourly);
  const span = Math.max(1, max - min);
  const points = hourly
    .map((v, idx) => {
      const x = pad + (idx / 23) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="cp-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-[#7A6A62]">
            {t('common:zoneWithLabel', {
              zone: getZoneLabel(metricData.area.zone, language),
            })}{' '}
            ·{' '}
            {localizeDigits(
              t('heatmap:popShort', {
                count: Number((metricData.area.population / 1000).toFixed(0)),
              }),
              language,
              useNativeNumerals
            )}
          </span>
          <h3 className="text-lg font-bold text-[#5A4A42]">{areaName}</h3>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={t('heatmap:closeDetailAria')}
            className="w-8 h-8 rounded-full border border-[#F0E6DF] inline-flex items-center justify-center text-[#5A4A42] hover:bg-[#FFF0E6] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 py-3 border-y border-[#F5EDE6]">
        <div>
          <div className="text-xs text-[#7A6A62]">{t('heatmap:current')}</div>
          <div className="text-lg font-bold text-[#5A4A42] tabular-nums">
            {formatNumber(val, language, useNativeNumerals)} {unit}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#7A6A62]">{t('heatmap:vs24hAvg')}</div>
          <div
            className={`text-lg font-bold tabular-nums ${
              pct >= 0 ? 'text-[#964825]' : 'text-[#0D3B20]'
            }`}
          >
            {localizeDigits(
              pct >= 0 ? `+${pct}%` : `${pct}%`,
              language,
              useNativeNumerals
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#7A6A62]">{t('heatmap:peakHour')}</div>
          <div className="text-lg font-bold text-[#5A4A42] tabular-nums">
            {formatHourLabel(peakHr, language, useNativeNumerals)}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
          <span className="font-semibold text-[#5A4A42]">
            {localizeDigits(t('heatmap:trend24h'), language, useNativeNumerals)}
          </span>
          <span className="text-[#7A6A62] tabular-nums">
            {localizeDigits(
              t('heatmap:peakSummary', {
                value: peakVal,
                unit,
                tier: t(`heatmap:${band.tierKey}`),
              }),
              language,
              useNativeNumerals
            )}
          </span>
        </div>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-20 rounded-xl bg-[#FFF9F2] border border-[#F5EDE6]"
          role="img"
          aria-label={localizeDigits(
            t('heatmap:sparklineAria', {
              metric: t(`common:metrics.${activeMetric}`),
              area: areaName,
            }),
            language,
            useNativeNumerals
          )}
        >
          <polyline
            fill="none"
            stroke={
              activeMetric === 'electricity'
                ? '#FF9B71'
                : activeMetric === 'water'
                ? '#5BB8F5'
                : '#FF6B6B'
            }
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>
    </div>
  );
};
