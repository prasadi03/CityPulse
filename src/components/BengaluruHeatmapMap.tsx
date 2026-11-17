import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { dataService } from '../services/dataService';
import {
  ComputedAreaMetric,
  ConsumptionMetric,
  TimeRange,
  Zone,
} from '../types/citypulse';
import { useAppLanguage } from '../i18n';
import {
  formatNumber,
  getAreaLabel,
  getZoneLabel,
  localizeDigits,
} from '../i18n/formatters';

interface BengaluruHeatmapMapProps {
  metrics: ComputedAreaMetric[];
  activeMetric: ConsumptionMetric;
  timeRange: TimeRange;
  zoneFilter: 'All' | Zone;
  selectedAreaId: string | null;
  onSelectArea: (areaId: string) => void;
  getAreaValue: (m: ComputedAreaMetric) => number;
  getAreaIntensity: (m: ComputedAreaMetric) => number;
  unit: string;
  heightClass?: string;
}

const ZONE_CENTERS: Record<'All' | Zone, { center: [number, number]; zoom: number }> = {
  All: { center: [12.9716, 77.605], zoom: 12 },
  North: { center: [13.042, 77.590], zoom: 13 },
  South: { center: [12.905, 77.605], zoom: 13 },
  East: { center: [12.968, 77.695], zoom: 13 },
  West: { center: [12.976, 77.520], zoom: 13 },
  Central: { center: [12.978, 77.624], zoom: 14 },
};

const CORRIDOR_KIND_KEY_MAP: Record<string, string> = {
  Construction: 'heatmap:corridorKinds.construction',
  Blockage: 'heatmap:corridorKinds.blockage',
  Accident: 'heatmap:corridorKinds.accident',
  'Pipe Work': 'heatmap:corridorKinds.pipeWork',
  'Grid Work': 'heatmap:corridorKinds.gridWork',
  'New Road Opened': 'heatmap:corridorKinds.newRoadOpened',
  'New Corridor': 'heatmap:corridorKinds.newCorridor',
  'New Road': 'heatmap:corridorKinds.newRoad',
  'New Drain Link': 'heatmap:corridorKinds.newDrainLink',
  'New Solar Grid': 'heatmap:corridorKinds.newSolarGrid',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getHeatColors(intensity: number): {
  fill: string;
  stroke: string;
  tierKey: 'bandLow' | 'bandModerate' | 'bandHigh' | 'bandVeryHigh';
  badgeBg: string;
  badgeText: string;
  symbol: string;
} {
  if (intensity >= 83) {
    return {
      fill: '#FF6B6B',
      stroke: '#E53935',
      tierKey: 'bandVeryHigh',
      badgeBg: '#FF8B7B',
      badgeText: '#5A4A42',
      symbol: '▲▲',
    };
  }
  if (intensity >= 65) {
    return {
      fill: '#FF9B71',
      stroke: '#E06D3B',
      tierKey: 'bandHigh',
      badgeBg: '#FFC49B',
      badgeText: '#5A4A42',
      symbol: '▲',
    };
  }
  if (intensity >= 40) {
    return {
      fill: '#FFC93C',
      stroke: '#D9A100',
      tierKey: 'bandModerate',
      badgeBg: '#FFF0A8',
      badgeText: '#5A4A42',
      symbol: '',
    };
  }
  return {
    fill: '#FFE8A3',
    stroke: '#D8C27A',
    tierKey: 'bandLow',
    badgeBg: '#FFFBF2',
    badgeText: '#5A4A42',
    symbol: '',
  };
}

export const BengaluruHeatmapMap: React.FC<BengaluruHeatmapMapProps> = ({
  metrics,
  activeMetric,
  timeRange,
  zoneFilter,
  selectedAreaId,
  onSelectArea,
  getAreaValue,
  getAreaIntensity,
  unit,
  heightClass = 'h-[470px]',
}) => {
  const { language, useNativeNumerals, t } = useAppLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [showRedOverlay, setShowRedOverlay] = useState(true);
  const [showGreenOverlay, setShowGreenOverlay] = useState(true);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: ZONE_CENTERS.All.center,
      zoom: ZONE_CENTERS.All.zoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Pan/Zoom smoothly when Zone filter or selected area changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedAreaId) {
      const target = metrics.find((m) => m.area.id === selectedAreaId);
      if (target) {
        map.flyTo([target.area.lat, target.area.lng], 13, { duration: 0.55 });
        return;
      }
    }

    const cfg = ZONE_CENTERS[zoneFilter] ?? ZONE_CENTERS.All;
    map.flyTo(cfg.center, cfg.zoom, { duration: 0.55 });
  }, [zoneFilter, selectedAreaId, metrics]);

  // Draw Bengaluru heat circles, area numeric pins, and red/green road overlays
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const timeRangeLabel =
      timeRange === 'now'
        ? t('heatmap:timeNow')
        : localizeDigits(timeRange, language, useNativeNumerals);

    // 1. Area Heat Circles + Numeric Pins
    metrics.forEach((m) => {
      const val = getAreaValue(m);
      const intensity = getAreaIntensity(m);
      const heat = getHeatColors(intensity);
      const isSelected = selectedAreaId === m.area.id;

      const localizedArea = getAreaLabel(m.area.id, language, m.area.name);
      const localizedZone = t('common:zoneWithLabel', {
        zone: getZoneLabel(m.area.zone, language),
      });
      const localizedTier = t(`heatmap:${heat.tierKey}`);
      const formattedVal = formatNumber(val, language, useNativeNumerals);
      const formattedIntensity = formatNumber(
        intensity,
        language,
        useNativeNumerals
      );
      const formattedHundred = formatNumber(100, language, useNativeNumerals);

      // Outer radial heat glow circle
      const radiusMeters = 900 + intensity * 11;
      const circle = L.circle([m.area.lat, m.area.lng], {
        radius: radiusMeters,
        color: isSelected ? '#5A4A42' : heat.stroke,
        weight: isSelected ? 2.5 : 1.2,
        opacity: isSelected ? 0.95 : 0.65,
        fillColor: heat.fill,
        fillOpacity: 0.34 + (intensity / 100) * 0.28,
      });

      const metricLabel =
        activeMetric === 'electricity'
          ? t('common:metrics.electricity')
          : activeMetric === 'water'
          ? t('common:metrics.water')
          : t('common:metrics.trafficLoad');

      circle.bindPopup(`
        <div style="min-width:190px;padding:3px 2px;">
          <div style="font-size:11px;font-weight:700;color:#7A6A62;">
            ${escapeHtml(localizedZone)} · ${escapeHtml(metricLabel)} (${escapeHtml(timeRangeLabel)})
          </div>
          <div style="font-size:14px;font-weight:700;color:#5A4A42;margin:2px 0;">
            ${escapeHtml(localizedArea)}
          </div>
          <div style="font-size:13px;font-weight:700;color:#5A4A42;">
            ${escapeHtml(formattedVal)} ${escapeHtml(unit)} · ${escapeHtml(localizedTier)} (${escapeHtml(formattedIntensity)}/${escapeHtml(formattedHundred)})
          </div>
        </div>
      `);

      circle.on('click', () => onSelectArea(m.area.id));
      circle.addTo(group);

      // Numeric Badge Marker at area center
      const pinHtml = `
        <div style="display:inline-flex;align-items:center;gap:4px;background:${heat.badgeBg};color:${heat.badgeText};border:${
        isSelected ? '2px solid #5A4A42' : `1.5px solid ${heat.stroke}`
      };border-radius:9999px;padding:2px 8px;font-family:'Inter','Noto Sans Kannada','Noto Sans Devanagari',sans-serif;font-size:11px;font-weight:700;line-height:1.25;white-space:nowrap;box-shadow:0 3px 10px rgba(90,74,66,0.2);transform:translate(-50%,-50%);">
          <span>${escapeHtml(localizedArea)}</span>
          <span style="font-variant-numeric:tabular-nums;">${escapeHtml(formattedVal)}${escapeHtml(unit)}</span>
          ${heat.symbol ? `<span style="font-size:10px;">${heat.symbol}</span>` : ''}
        </div>
      `;

      const marker = L.marker([m.area.lat, m.area.lng], {
        icon: L.divIcon({
          className: 'cp-map-pin-wrapper',
          html: pinHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        zIndexOffset: isSelected ? 900 : 300 + intensity,
      });

      marker.on('click', () => onSelectArea(m.area.id));
      marker.addTo(group);
    });

    // 2. Red (Construction/Blockage/Accident) & Green (Newly Opened Roads/Additions) Corridors
    const overlays = dataService.getMapCorridorOverlays(activeMetric);
    overlays.forEach((ov) => {
      if (ov.category === 'red' && !showRedOverlay) return;
      if (ov.category === 'green' && !showGreenOverlay) return;

      const isRed = ov.category === 'red';
      const stroke = isRed ? '#E53935' : '#16A34A';
      const border = isRed ? '#991B1B' : '#14532D';
      const tagLabel = isRed
        ? t('heatmap:redZoneTag')
        : t('heatmap:greenZoneTag');
      const badgeKey = CORRIDOR_KIND_KEY_MAP[ov.badge];
      const localizedBadge = badgeKey ? t(badgeKey) : ov.badge;

      if (ov.path && ov.path.length > 1) {
        const line = L.polyline(ov.path, {
          color: stroke,
          weight: 6,
          opacity: 0.9,
          dashArray: isRed ? '8, 6' : undefined,
        });
        line.bindPopup(`
          <div style="min-width:200px;padding:3px 2px;">
            <div style="font-size:11px;font-weight:700;color:${stroke};">
              ${escapeHtml(tagLabel)}
            </div>
            <div style="font-size:13px;font-weight:700;color:#5A4A42;margin:2px 0;">
              ${escapeHtml(ov.title)}
            </div>
            <div style="font-size:12px;color:#7A6A62;">
              ${escapeHtml(ov.summary)}
            </div>
          </div>
        `);
        line.addTo(group);
      }

      const ovHtml = `
        <div style="display:inline-flex;align-items:center;gap:4px;background:${stroke};color:#FFFFFF;border:1.5px solid ${border};border-radius:9999px;padding:2px 8px;font-family:'Inter','Noto Sans Kannada','Noto Sans Devanagari',sans-serif;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 3px 10px rgba(90,74,66,0.25);transform:translate(-50%,-50%);">
          <span>${escapeHtml(localizedBadge)}</span>
        </div>
      `;

      const ovPin = L.marker([ov.lat, ov.lng], {
        icon: L.divIcon({
          className: 'cp-map-pin-wrapper',
          html: ovHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        zIndexOffset: 700,
      });

      ovPin.bindPopup(`
        <div style="min-width:200px;padding:3px 2px;">
          <div style="font-size:11px;font-weight:700;color:${stroke};">
            ${escapeHtml(tagLabel)}
          </div>
          <div style="font-size:13px;font-weight:700;color:#5A4A42;margin:2px 0;">
            ${escapeHtml(ov.title)}
          </div>
          <div style="font-size:12px;color:#7A6A62;">
            ${escapeHtml(ov.summary)}
          </div>
        </div>
      `);
      ovPin.addTo(group);
    });
  }, [
    metrics,
    activeMetric,
    timeRange,
    selectedAreaId,
    showRedOverlay,
    showGreenOverlay,
    unit,
    language,
    useNativeNumerals,
    t,
    getAreaValue,
    getAreaIntensity,
    onSelectArea,
  ]);

  return (
    <div className="cp-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-[#7A6A62]">
          {localizeDigits(t('heatmap:mapHeader'), language, useNativeNumerals)}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRedOverlay((prev) => !prev)}
            className={`min-h-8 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border cursor-pointer ${
              showRedOverlay
                ? 'bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B]'
                : 'bg-[#FFF9F2] border-[#F0E6DF] text-[#7A6A62]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#E53935] shrink-0" aria-hidden="true" />
            <span>{t('heatmap:redOverlayToggle')}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGreenOverlay((prev) => !prev)}
            className={`min-h-8 px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 border cursor-pointer ${
              showGreenOverlay
                ? 'bg-[#DCFCE7] border-[#86EFAC] text-[#14532D]'
                : 'bg-[#FFF9F2] border-[#F0E6DF] text-[#7A6A62]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] shrink-0" aria-hidden="true" />
            <span>{t('heatmap:greenOverlayToggle')}</span>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`w-full ${heightClass} rounded-2xl border border-[#F0E6DF] overflow-hidden`}
        aria-label={t('heatmap:mapAria')}
      />
    </div>
  );
};
