import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localesDir = path.resolve(__dirname, '..', 'locales');

const ALLOWED_NAMESPACES = [
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
];

type JsonValue = string | number | boolean | null | JsonObject;
interface JsonObject {
  [key: string]: JsonValue;
}

function flattenKeys(obj: JsonObject, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flattenKeys(v as JsonObject, nextKey));
    } else {
      out[nextKey] = String(v ?? '');
    }
  }
  return out;
}

function loadLocale(code: string): JsonObject {
  const filePath = path.join(localesDir, `${code}.json`);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as JsonObject;
}

const enRaw = loadLocale('en');
const knRaw = loadLocale('kn');
const hiRaw = loadLocale('hi');

const enFlat = flattenKeys(enRaw);
const enKeys = Object.keys(enFlat);

let hasFailure = false;

for (const ns of ALLOWED_NAMESPACES) {
  if (!(ns in enRaw)) {
    console.error(`[FAIL] en.json missing required namespace: ${ns}`);
    hasFailure = true;
  }
}

for (const lang of ['kn', 'hi'] as const) {
  const targetRaw = lang === 'kn' ? knRaw : hiRaw;
  const targetFlat = flattenKeys(targetRaw);

  const missingKeys = enKeys.filter((k) => !(k in targetFlat));
  const emptyKeys = enKeys.filter(
    (k) => k in targetFlat && targetFlat[k].trim().length === 0
  );
  const extraKeys = Object.keys(targetFlat).filter((k) => !(k in enFlat));
  const identicalKeys = enKeys.filter(
    (k) =>
      k in targetFlat &&
      targetFlat[k].trim() === enFlat[k].trim() &&
      enFlat[k].trim().length > 0
  );

  if (missingKeys.length > 0) {
    console.error(`[FAIL] ${lang}.json is missing ${missingKeys.length} keys:`);
    missingKeys.forEach((k) => console.error(`  - ${k}`));
    hasFailure = true;
  }

  if (emptyKeys.length > 0) {
    console.error(`[FAIL] ${lang}.json has ${emptyKeys.length} empty values:`);
    emptyKeys.forEach((k) => console.error(`  - ${k}`));
    hasFailure = true;
  }

  if (extraKeys.length > 0) {
    console.error(`[FAIL] ${lang}.json has ${extraKeys.length} extra keys not in en.json:`);
    extraKeys.forEach((k) => console.error(`  - ${k}`));
    hasFailure = true;
  }

  if (identicalKeys.length > 0) {
    console.error(
      `[FAIL] ${lang}.json has ${identicalKeys.length} untranslated entries identical to English:`
    );
    identicalKeys.forEach((k) =>
      console.error(`  - ${k} = "${targetFlat[k]}"`)
    );
    hasFailure = true;
  }
}

// Verify areas.json has all 30 Bengaluru areas in en, kn, hi
const areasLookup = JSON.parse(
  fs.readFileSync(path.join(localesDir, 'areas.json'), 'utf-8')
) as {
  zones: Record<string, { en: string; kn: string; hi: string }>;
  areas: Record<string, { en: string; kn: string; hi: string; zone: string }>;
};
const bangaloreAreas = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '..', 'src', 'data', 'bangaloreAreas.json'),
    'utf-8'
  )
) as { id: string; name: string; zone: string }[];

for (const a of bangaloreAreas) {
  const entry = areasLookup.areas[a.id];
  if (!entry || !entry.en || !entry.kn || !entry.hi) {
    console.error(`[FAIL] areas.json missing/incomplete translation for ${a.id}`);
    hasFailure = true;
  }
}

if (hasFailure) {
  process.exit(1);
}

console.log(
  `[PASS] i18n key-parity & translation check succeeded (${enKeys.length} keys across en, kn, hi + ${bangaloreAreas.length} areas).`
);
