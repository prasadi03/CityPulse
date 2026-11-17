import type { TFunction } from 'i18next';
import areasData from '../../locales/areas.json';
import type { DepartmentId, Zone } from '../types/citypulse';
import type { AppLanguage } from './index';

type AreaEntry = { en: string; kn: string; hi: string; zone: Zone };
type ZoneEntry = { en: string; kn: string; hi: string };

const AREAS_MAP = areasData.areas as Record<string, AreaEntry>;
const ZONES_MAP = areasData.zones as Record<Zone, ZoneEntry>;

export function getAreaLabel(
  areaId: string,
  lang: AppLanguage,
  fallbackName?: string
): string {
  const entry = AREAS_MAP[areaId];
  if (!entry) return fallbackName ?? areaId;
  return entry[lang] || entry.en;
}

export function getAreaLabelByName(
  areaName: string,
  lang: AppLanguage
): string {
  const lower = areaName.trim().toLowerCase();
  for (const entry of Object.values(AREAS_MAP)) {
    if (entry.en.toLowerCase() === lower) {
      return entry[lang] || entry.en;
    }
  }
  return areaName;
}

export function formatAffectedAreasList(
  affectedAreasCsv: string,
  lang: AppLanguage
): string {
  return affectedAreasCsv
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((name) => getAreaLabelByName(name, lang))
    .join(', ');
}

export function getZoneLabel(zone: Zone, lang: AppLanguage): string {
  const entry = ZONES_MAP[zone];
  if (!entry) return zone;
  return entry[lang] || entry.en;
}

export function areaMatchesSearch(areaId: string, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const entry = AREAS_MAP[areaId];
  if (!entry) return areaId.toLowerCase().includes(q);
  const zoneEntry = ZONES_MAP[entry.zone];
  return (
    areaId.toLowerCase().includes(q) ||
    entry.en.toLowerCase().includes(q) ||
    entry.kn.toLowerCase().includes(q) ||
    entry.hi.toLowerCase().includes(q) ||
    entry.zone.toLowerCase().includes(q) ||
    (zoneEntry ? zoneEntry.kn.toLowerCase().includes(q) : false) ||
    (zoneEntry ? zoneEntry.hi.toLowerCase().includes(q) : false)
  );
}

export function getDepartmentLabel(
  deptId: DepartmentId,
  t: TFunction,
  short = false
): string {
  return short
    ? t(`departments:short.${deptId}`)
    : t(`departments:names.${deptId}`);
}

export function getCategoryLabel(category: string, t: TFunction): string {
  return t(`report:categories.${category}`, { defaultValue: category });
}

export function getIntlLocale(
  lang: AppLanguage,
  useNativeNumerals: boolean
): string {
  if (lang === 'kn') {
    return useNativeNumerals ? 'kn-IN-u-nu-knda' : 'kn-IN-u-nu-latn';
  }
  if (lang === 'hi') {
    return useNativeNumerals ? 'hi-IN-u-nu-deva' : 'hi-IN-u-nu-latn';
  }
  return 'en-IN-u-nu-latn';
}

const KANNADA_DIGITS = ['೦', '೧', '೨', '೩', '೪', '೫', '೬', '೭', '೮', '೯'];
const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function localizeDigits(
  input: string | number,
  lang: AppLanguage,
  useNativeNumerals: boolean
): string {
  const str = String(input);
  if (!useNativeNumerals || lang === 'en') return str;
  const map = lang === 'kn' ? KANNADA_DIGITS : DEVANAGARI_DIGITS;
  return str.replace(/\d/g, (d) => map[Number(d)] ?? d);
}

export function formatNumber(
  value: number,
  lang: AppLanguage,
  useNativeNumerals: boolean,
  options?: Intl.NumberFormatOptions
): string {
  const locale = getIntlLocale(lang, useNativeNumerals);
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatHourLabel(
  hour: number,
  lang: AppLanguage,
  useNativeNumerals: boolean
): string {
  const hh = String(hour).padStart(2, '0');
  return localizeDigits(`${hh}:00`, lang, useNativeNumerals);
}

export function formatDateLocalized(
  dateStr: string,
  lang: AppLanguage,
  useNativeNumerals: boolean
): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return localizeDigits(dateStr, lang, useNativeNumerals);
  }
  const [y, m, d] = parts;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const locale = getIntlLocale(lang, useNativeNumerals);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

export function formatTimeLocalized(
  timeStr: string,
  lang: AppLanguage,
  useNativeNumerals: boolean
): string {
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2 || parts.some(Number.isNaN)) {
    return localizeDigits(timeStr, lang, useNativeNumerals);
  }
  const [hh, mm] = parts;
  const dt = new Date(Date.UTC(2026, 0, 1, hh, mm, 0));
  const locale = getIntlLocale(lang, useNativeNumerals);
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(dt);
}

export function formatClockTimestamp(
  timestampMs: number,
  lang: AppLanguage,
  useNativeNumerals: boolean
): string {
  const locale = getIntlLocale(lang, useNativeNumerals);
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestampMs));
}

export function formatRelativeTimeText(
  raw: string,
  t: TFunction,
  lang: AppLanguage,
  useNativeNumerals: boolean
): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'just now') return t('common:relativeTime.justNow');
  if (lower === 'today') return t('common:relativeTime.today');
  if (lower === 'scheduled') return t('common:status.scheduled');

  const secMatch = lower.match(/^(\d+)\s*s\s*ago$/);
  if (secMatch) {
    const count = Number(secMatch[1]);
    return localizeDigits(
      t('common:relativeTime.secondsAgo', { count }),
      lang,
      useNativeNumerals
    );
  }

  const minMatch = lower.match(/^(\d+)\s*m\s*ago$/);
  if (minMatch) {
    const count = Number(minMatch[1]);
    return localizeDigits(
      t('common:relativeTime.minutesAgo', { count }),
      lang,
      useNativeNumerals
    );
  }

  const hrOldMatch = lower.match(/^(\d+)\s*h\s*old$/);
  if (hrOldMatch) {
    const count = Number(hrOldMatch[1]);
    return localizeDigits(
      t('common:relativeTime.hoursOld', { count }),
      lang,
      useNativeNumerals
    );
  }

  const hrMatch = lower.match(/^(\d+)\s*h\s*ago$/);
  if (hrMatch) {
    const count = Number(hrMatch[1]);
    return localizeDigits(
      t('common:relativeTime.hoursAgo', { count }),
      lang,
      useNativeNumerals
    );
  }

  const dayMatch = lower.match(/^(\d+)\s*d\s*ago$/);
  if (dayMatch) {
    const count = Number(dayMatch[1]);
    return localizeDigits(
      t('common:relativeTime.daysAgo', { count }),
      lang,
      useNativeNumerals
    );
  }

  return localizeDigits(trimmed, lang, useNativeNumerals);
}

export function detectScriptLanguage(text: string): AppLanguage {
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}
