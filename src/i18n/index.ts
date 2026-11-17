import { useEffect, useState } from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import en from '../../locales/en.json';
import kn from '../../locales/kn.json';
import hi from '../../locales/hi.json';

export type AppLanguage = 'en' | 'kn' | 'hi';

export const LANGUAGE_STORAGE_KEY = 'citypulse_language_v1';
export const NATIVE_NUMERALS_STORAGE_KEY = 'citypulse_native_numerals_v1';

export const LANGUAGE_OPTIONS: {
  code: AppLanguage;
  shortCode: string;
  nativeLabel: string;
  englishName: string;
}[] = [
  { code: 'en', shortCode: 'EN', nativeLabel: 'English', englishName: 'English' },
  { code: 'kn', shortCode: 'ಕ', nativeLabel: 'ಕನ್ನಡ', englishName: 'Kannada' },
  { code: 'hi', shortCode: 'हि', nativeLabel: 'हिन्दी', englishName: 'Hindi' },
];

export function normalizeLang(raw?: string | null): AppLanguage {
  const lower = (raw || '').toLowerCase();
  if (lower.startsWith('kn')) return 'kn';
  if (lower.startsWith('hi')) return 'hi';
  return 'en';
}

export function detectInitialLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'kn' || saved === 'hi') {
      return saved;
    }
  } catch {
    // ignore
  }

  if (typeof navigator !== 'undefined') {
    const candidates = [
      ...(Array.isArray(navigator.languages) ? navigator.languages : []),
      navigator.language,
    ].filter(Boolean);
    for (const c of candidates) {
      const lower = c.toLowerCase();
      if (lower.startsWith('kn')) return 'kn';
      if (lower.startsWith('hi')) return 'hi';
      if (lower.startsWith('en')) return 'en';
    }
  }
  return 'en';
}

function applyHtmlLang(lang: AppLanguage) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
}

const initialLanguage = detectInitialLanguage();
applyHtmlLang(initialLanguage);

const missingKeyLogCache = new Set<string>();

i18n.use(initReactI18next).init({
  resources: {
    en,
    kn,
    hi,
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [
    'common',
    'login',
    'home',
    'heatmap',
    'departments',
    'report',
    'worker',
    'nagara',
    'errors',
    'dataSources',
  ],
  interpolation: {
    escapeValue: false,
  },
  saveMissing: import.meta.env.DEV,
  missingKeyHandler(lngs, ns, key) {
    if (!import.meta.env.DEV) return;
    const tag = `${lngs.join(',')}:${ns}:${key}`;
    if (missingKeyLogCache.has(tag)) return;
    missingKeyLogCache.add(tag);
    console.warn(`[i18n] Missing translation key "${ns}:${key}" for language(s): ${lngs.join(', ')}. Falling back to English.`);
  },
});

export function setAppLanguage(lang: AppLanguage) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
  applyHtmlLang(lang);
  void i18n.changeLanguage(lang);
}

// Reactive native numerals preference (false = Western 0-9 by default for data accuracy)
const numeralListeners = new Set<() => void>();

export function getUseNativeNumerals(): boolean {
  try {
    return localStorage.getItem(NATIVE_NUMERALS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setUseNativeNumerals(nextVal: boolean) {
  try {
    localStorage.setItem(NATIVE_NUMERALS_STORAGE_KEY, String(nextVal));
  } catch {
    // ignore
  }
  numeralListeners.forEach((cb) => cb());
}

export function useAppLanguage() {
  const { i18n: i18nInstance, t } = useTranslation();
  const [useNativeNumerals, setNativeState] = useState<boolean>(() =>
    getUseNativeNumerals()
  );

  useEffect(() => {
    const onChange = () => setNativeState(getUseNativeNumerals());
    numeralListeners.add(onChange);
    return () => {
      numeralListeners.delete(onChange);
    };
  }, []);

  const language = normalizeLang(i18nInstance.resolvedLanguage || i18nInstance.language);

  return {
    language,
    setLanguage: setAppLanguage,
    useNativeNumerals,
    setUseNativeNumerals,
    t,
  };
}

export default i18n;
