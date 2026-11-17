import type { AppLanguage } from '../i18n';

const TRANSLATION_CACHE_PREFIX = 'citypulse_tr_v1_';
const memoryCache = new Map<string, string>();
const inFlightRequests = new Map<string, Promise<TranslationResult>>();

export type TranslationResult =
  | { ok: true; translation: string }
  | { ok: false; error: string };

export function hashText(input: string): string {
  // Deterministic FNV-1a 32-bit hash for stable localStorage cache keys
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getCacheKey(text: string, targetLang: AppLanguage): string {
  return `${TRANSLATION_CACHE_PREFIX}${targetLang}_${hashText(text.trim())}`;
}

export function getCachedTranslation(
  text: string,
  targetLang: AppLanguage
): string | null {
  const clean = text.trim();
  if (!clean) return text;
  const key = getCacheKey(clean, targetLang);
  const mem = memoryCache.get(key);
  if (mem) return mem;

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      memoryCache.set(key, stored);
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

function saveCachedTranslation(
  text: string,
  targetLang: AppLanguage,
  translation: string
) {
  const key = getCacheKey(text.trim(), targetLang);
  memoryCache.set(key, translation);
  try {
    localStorage.setItem(key, translation);
  } catch {
    // ignore quota errors
  }
}

export async function translateWithCache(
  text: string,
  targetLang: AppLanguage
): Promise<TranslationResult> {
  const clean = text.trim();
  if (!clean) return { ok: true, translation: text };

  const cached = getCachedTranslation(clean, targetLang);
  if (cached) {
    return { ok: true, translation: cached };
  }

  const cacheKey = getCacheKey(clean, targetLang);
  const existing = inFlightRequests.get(cacheKey);
  if (existing) return existing;

  const promise: Promise<TranslationResult> = (async () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean, targetLang }),
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        return { ok: false, error: 'Translation service unreachable' };
      }

      const data = (await response.json()) as {
        translation?: string;
        error?: string;
      };
      if (!response.ok || !data.translation) {
        return {
          ok: false,
          error: data.error || 'Translation unavailable',
        };
      }

      saveCachedTranslation(clean, targetLang, data.translation);
      return { ok: true, translation: data.translation };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Translation failed',
      };
    } finally {
      window.clearTimeout(timer);
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}
