import {
  GoogleGenAI,
  Type,
  type Content,
  type FunctionCall,
  type FunctionDeclaration,
  type Part,
} from '@google/genai';
import type {
  AppUpdateItem,
  DepartmentId,
  NagaraAppSnapshot,
  NagaraChatResponse,
  NagaraSourceTag,
} from '../src/types/citypulse.ts';
import glossaryData from '../locales/glossary.json' with { type: 'json' };

type SupportedLanguage = 'en' | 'kn' | 'hi';

interface ChatTurnInput {
  role: 'user' | 'assistant';
  content: string;
}

interface QueuedToolCall {
  id: string;
  name: string;
  args: Record<string, string>;
}

interface PendingLoopState {
  contents: Content[];
  executedParts: Part[];
  pendingToolCalls: QueuedToolCall[];
  collectedSources: NagaraSourceTag[];
  weatherUpdate?: { city: string; summary: string };
}

interface ApprovalDecisionInput {
  approved: boolean;
  toolCallId: string;
  pendingState: PendingLoopState;
}

export interface NagaraRequestBody {
  messages?: ChatTurnInput[];
  appSnapshot?: NagaraAppSnapshot;
  askBeforeExternalTools?: boolean;
  approvalDecision?: ApprovalDecisionInput;
  language?: SupportedLanguage;
}

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

const VALID_DEPARTMENTS: DepartmentId[] = [
  'electricity',
  'water',
  'roads',
  'traffic',
  'transport',
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 15000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0]
) {
  const delays = [400];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: unknown) {
      lastErr = err;
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : 0;
      const isTransient = status === 503 || status === 504 || status === 500;
      if (!isTransient || attempt === delays.length) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  throw lastErr;
}

const NAGARA_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_weather',
    description:
      'Get current live weather of a city in India (defaults to Bengaluru) via Google Search grounding.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: {
          type: Type.STRING,
          description: 'City name in India, defaults to Bengaluru.',
        },
      },
    },
  },
  {
    name: 'get_news',
    description:
      'Get the 3 latest live news updates about a city (defaults to Bengaluru) with URLs via Google Search grounding.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: {
          type: Type.STRING,
          description: 'City name, defaults to Bengaluru.',
        },
      },
    },
  },
  {
    name: 'get_app_updates',
    description:
      'Get the role-scoped live updates feed from CityPulse Bengaluru (announcements, outages, supply schedules, issue status changes, heatmap highlights, SLA warnings).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        scope: {
          type: Type.STRING,
          description:
            'Optional filter such as all, personal, outage, heatmap, sla, issues, weather.',
        },
      },
    },
  },
  {
    name: 'get_area_data',
    description:
      'Get verified/demo utility consumption or traffic load metrics for a specific Bengaluru ward/area from the CityPulse dataset.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        area: {
          type: Type.STRING,
          description:
            'Bengaluru area or ward name (e.g. Whitefield, Indiranagar, Koramangala).',
        },
        system: {
          type: Type.STRING,
          description: 'Optional system filter: electricity, water, or traffic.',
        },
      },
      required: ['area'],
    },
  },
  {
    name: 'get_my_reports',
    description:
      'For logged-in Citizens: get their own submitted civic reports, statuses, scheduled ETAs, and worker replies.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_department_issues',
    description:
      'For Municipal Workers: get issues belonging strictly to their own department queue (pending, scheduled, oldest unresolved).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filter: {
          type: Type.STRING,
          description: 'Optional filter: all, pending, scheduled, oldest.',
        },
      },
    },
  },
];

function sanitizeSnapshot(raw: NagaraAppSnapshot | undefined): NagaraAppSnapshot {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Missing app snapshot in request.');
  }

  const role =
    raw.role === 'worker' || raw.role === 'citizen' || raw.role === 'guest'
      ? raw.role
      : 'guest';

  const deptId =
    role === 'worker' &&
    raw.departmentId &&
    VALID_DEPARTMENTS.includes(raw.departmentId)
      ? raw.departmentId
      : undefined;

  if (role === 'worker' && !deptId) {
    throw new Error('Worker request missing valid departmentId.');
  }

  // Enforce strict department isolation on the server regardless of what client sent
  const scopedUpdates: AppUpdateItem[] = (raw.updatesFeed ?? []).filter((u) => {
    if (role === 'worker' && deptId) {
      return u.departmentId === deptId || u.departmentId === 'weather';
    }
    return true;
  });

  const scopedAnnouncements = (raw.announcements ?? []).filter((a) => {
    if (role === 'worker' && deptId) {
      return a.departmentId === deptId;
    }
    return true;
  });

  const scopedAreas = (raw.areasData ?? [])
    .map((area) => {
      if (role !== 'worker') return area;
      if (deptId === 'electricity') {
        return {
          areaId: area.areaId,
          areaName: area.areaName,
          zone: area.zone,
          electricityNowMW: area.electricityNowMW,
          electricity24hAvgMW: area.electricity24hAvgMW,
          electricityPeakMW: area.electricityPeakMW,
          electricityPeakHour: area.electricityPeakHour,
          electricityIntensity: area.electricityIntensity,
          electricitySource: area.electricitySource,
        };
      }
      if (deptId === 'water') {
        return {
          areaId: area.areaId,
          areaName: area.areaName,
          zone: area.zone,
          waterNowMLD: area.waterNowMLD,
          water24hAvgMLD: area.water24hAvgMLD,
          waterPeakMLD: area.waterPeakMLD,
          waterPeakHour: area.waterPeakHour,
          waterIntensity: area.waterIntensity,
          waterSource: area.waterSource,
        };
      }
      if (deptId === 'traffic') {
        return {
          areaId: area.areaId,
          areaName: area.areaName,
          zone: area.zone,
          trafficNowPct: area.trafficNowPct,
          traffic24hAvgPct: area.traffic24hAvgPct,
          trafficPeakPct: area.trafficPeakPct,
          trafficIntensity: area.trafficIntensity,
          trafficSource: area.trafficSource,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const scopedMyReports =
    role === 'citizen'
      ? (raw.myReports ?? []).filter((r) => r.isMine !== false)
      : [];

  const scopedDeptIssues =
    role === 'worker' && deptId
      ? (raw.departmentIssues ?? []).filter((i) => i.departmentId === deptId)
      : role !== 'worker'
      ? raw.departmentIssues ?? []
      : [];

  return {
    role,
    userId: String(raw.userId || 'guest'),
    userName: String(raw.userName || 'User'),
    departmentId: deptId,
    department: role === 'worker' ? raw.department : undefined,
    areaId: raw.areaId,
    areaName: raw.areaName,
    verificationMode: 'Demo',
    periodLabel: raw.periodLabel || 'Live',
    lastUpdatedIso: raw.lastUpdatedIso || new Date().toISOString(),
    updatesFeed: scopedUpdates,
    announcements: scopedAnnouncements,
    areasData: scopedAreas,
    myReports: scopedMyReports,
    departmentIssues: scopedDeptIssues,
  };
}

const LANG_LABEL: Record<SupportedLanguage, string> = {
  en: 'English',
  kn: 'Kannada (ಕನ್ನಡ)',
  hi: 'Hindi (हिन्दी)',
};

const DATA_NOT_AVAILABLE_PHRASE: Record<SupportedLanguage, string> = {
  en: 'Data not available',
  kn: 'ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ (Data not available)',
  hi: 'डेटा उपलब्ध नहीं है (Data not available)',
};

function buildGlossaryBlock(lang: SupportedLanguage): string {
  if (lang === 'en') return '';
  const terms = glossaryData.terms as Record<
    string,
    { en: string; kn: string; hi: string }
  >;
  const lines = Object.values(terms)
    .slice(0, 26)
    .map((entry) => `- ${entry.en} -> ${entry[lang]}`);
  return [
    `Official Civic Glossary for ${LANG_LABEL[lang]} (use these exact terms consistently):`,
    ...lines,
    `Keep these UNTRANSLATED verbatim: ${glossaryData.untranslated.join(', ')}.`,
  ].join('\n');
}

function buildSystemPrompt(
  snapshot: NagaraAppSnapshot,
  language: SupportedLanguage = 'en'
): string {
  const roleContext =
    snapshot.role === 'worker'
      ? `The logged-in user is a Municipal Worker (${snapshot.userName}) strictly assigned to department: ${snapshot.department} (departmentId: ${snapshot.departmentId}).`
      : snapshot.role === 'citizen'
      ? `The logged-in user is a Bengaluru Citizen (${snapshot.userName}), pinned neighborhood: ${snapshot.areaName || 'Not pinned yet'}.`
      : `The user is a Guest Viewer (view-only). Pinned neighborhood: ${snapshot.areaName || 'Not pinned yet'}.`;

  const targetLangName = LANG_LABEL[language] ?? 'English';

  return [
    'You are NagaraAI, a helpful city assistant for Bengaluru. Be concise. Use bullet points for updates. Use only the tools and app data provided.',
    '',
    `Current User Context: ${roleContext}`,
    `App Verification Mode: ${snapshot.verificationMode} (Period: ${snapshot.periodLabel}).`,
    `Selected App Language: ${targetLangName}.`,
    '',
    'LANGUAGE & GLOSSARY INSTRUCTIONS:',
    `Reply in ${targetLangName}. Use the app's glossary terms. Keep numbers, units, dates, acronyms, source names and URLs exactly as given in tool results. If the user writes in a different language, reply in the language they wrote in.`,
    buildGlossaryBlock(language),
    '',
    'CRITICAL NO-HALLUCINATION & SECURITY RULES:',
    '1. Every number, date, area, or status in your reply MUST come from a tool result or the app snapshot. NEVER invent, extrapolate, or estimate figures.',
    `2. If requested data is missing or unavailable in the dataset/tools, say "${DATA_NOT_AVAILABLE_PHRASE[language]}" and state which official source would provide it (e.g., BESCOM, BWSSB, BBMP, BTP Traffic, BMTC, or live Search). Do not guess.`,
    '3. Cite the source badge and period for each figure (for example: "Source: BESCOM (Demo), Now" or "Source: BWSSB (Demo), 24h avg"), and always include the exact URL for news items.',
    '4. Clearly distinguish external tools (Weather, News) as "External / Live" and app data as "Demo" (since CityPulse is currently running in Demo mode). Mention Demo mode when citing app figures.',
    '5. Role & Department Isolation: If the user is a Municipal Worker, ONLY discuss their own department and politely refuse requests about other departments or other citizens’ personal data. If a Citizen asks about internal worker notes or other citizens’ private reports, politely refuse.',
    '6. If a tool returns "Tool call denied by user.", acknowledge politely without guessing the external data.',
  ]
    .filter(Boolean)
    .join('\n');
}

const WMO_CODES: Record<number, string> = {
  0: 'clear sky',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'depositing rime fog',
  51: 'light drizzle',
  53: 'moderate drizzle',
  55: 'dense drizzle',
  61: 'slight rain',
  63: 'moderate rain',
  65: 'heavy rain',
  71: 'slight snow',
  80: 'slight rain showers',
  81: 'moderate rain showers',
  82: 'violent rain showers',
  95: 'thunderstorm',
  96: 'thunderstorm with hail',
};

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function runWeatherTool(
  _ai: GoogleGenAI,
  cityArg?: string
): Promise<{ content: string; sources: NagaraSourceTag[]; weatherSummary?: string }> {
  const city = (cityArg && cityArg.trim()) || 'Bengaluru';
  try {
    let lat = 12.9716;
    let lon = 77.5946;
    let resolvedName = 'Bengaluru';

    if (city.toLowerCase() !== 'bengaluru' && city.toLowerCase() !== 'bangalore') {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        city
      )}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const geoData = (await geoRes.json()) as {
          results?: { latitude: number; longitude: number; name: string }[];
        };
        if (geoData.results && geoData.results.length > 0) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
          resolvedName = geoData.results[0].name;
        } else {
          return {
            content: `Error: Could not locate weather coordinates for "${city}".`,
            sources: [{ label: 'Open-Meteo · External / Live', kind: 'External / Live' }],
          };
        }
      }
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;
    const res = await fetch(weatherUrl);
    if (!res.ok) {
      throw new Error(`Weather endpoint returned ${res.status}`);
    }

    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
    };

    const temp = data.current?.temperature_2m;
    const code = data.current?.weather_code ?? 0;
    const desc = WMO_CODES[code] ?? 'clear';
    const humidity = data.current?.relative_humidity_2m;
    const wind = data.current?.wind_speed_10m;

    if (temp === undefined) {
      throw new Error('Could not fetch current temperature');
    }

    const summary = `Weather in ${resolvedName}: ${desc}, ${temp}°C`;
    const details = `${summary} (Humidity: ${humidity ?? '—'}%, Wind: ${wind ?? '—'} km/h · Source: Open-Meteo · External / Live, Now)`;

    return {
      content: details,
      sources: [
        {
          label: 'Open-Meteo · External / Live',
          kind: 'External / Live',
          url: 'https://open-meteo.com/',
        },
      ],
      weatherSummary: summary,
    };
  } catch (err) {
    return {
      content: `Error: ${
        err instanceof Error ? err.message : 'Could not fetch live weather.'
      }`,
      sources: [{ label: 'Open-Meteo · External / Live', kind: 'External / Live' }],
    };
  }
}

async function runNewsTool(
  _ai: GoogleGenAI,
  cityArg?: string
): Promise<{ content: string; sources: NagaraSourceTag[] }> {
  const city = (cityArg && cityArg.trim()) || 'Bengaluru';
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      `${city} India`
    )}&hl=en-IN&gl=IN&ceid=IN:en`;
    const res = await fetch(rssUrl);
    if (!res.ok) {
      throw new Error(`News feed returned ${res.status}`);
    }
    const xml = await res.text();
    const itemMatches = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).slice(
      0,
      3
    );

    if (itemMatches.length === 0) {
      return {
        content: `No news found for ${city}`,
        sources: [{ label: 'Google News · External / Live', kind: 'External / Live' }],
      };
    }

    const sources: NagaraSourceTag[] = [];
    const lines = itemMatches.map((m) => {
      const block = m[1];
      const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? 'No title';
      const rawLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '';
      const rawDesc =
        block.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';
      const title = decodeXmlEntities(rawTitle);
      const url = decodeXmlEntities(rawLink);
      const snippet = decodeXmlEntities(rawDesc).slice(0, 100);
      if (url) {
        sources.push({
          label: 'Google News · External / Live',
          kind: 'External / Live',
          url,
        });
      }
      return `- ${title}\n  URL: ${url}\n  Snippet: ${snippet}...`;
    });

    return {
      content: `Latest news in ${city} (Source: Google News · External / Live):\n\n${lines.join(
        '\n\n'
      )}`,
      sources:
        sources.length > 0
          ? sources
          : [{ label: 'Google News · External / Live', kind: 'External / Live' }],
    };
  } catch (err) {
    return {
      content: `Error fetching news: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`,
      sources: [{ label: 'Google News · External / Live', kind: 'External / Live' }],
    };
  }
}

function runInternalTool(
  toolName: string,
  args: Record<string, string>,
  snapshot: NagaraAppSnapshot
): { content: string; source: NagaraSourceTag } {
  const modeLabel = `Mode: ${snapshot.verificationMode}`;

  if (toolName === 'get_app_updates') {
    const scope = (args.scope || 'all').toLowerCase();
    const filtered = snapshot.updatesFeed.filter((u) => {
      if (scope === 'all' || !scope) return true;
      if (scope === 'personal') return Boolean(u.isPersonal);
      if (scope === 'outage' || scope === 'schedule' || scope === 'water') {
        return (
          u.category === 'outage' ||
          u.category === 'announcement' ||
          u.departmentId === 'water'
        );
      }
      if (scope === 'heatmap') return u.category === 'heatmap';
      if (scope === 'sla') return u.category === 'sla_warning';
      if (scope === 'issues') {
        return (
          u.category === 'new_issue' ||
          u.category === 'issue_status' ||
          u.category === 'worker_reply'
        );
      }
      return u.departmentId === scope || u.category === scope;
    });

    if (filtered.length === 0) {
      return {
        content: `Data not available for scope '${scope}' in your current role feed (${modeLabel}).`,
        source: {
          label: `CityPulse Feed (${snapshot.verificationMode})`,
          kind: 'Official / Verified / Demo',
        },
      };
    }

    return {
      content: JSON.stringify({
        verificationMode: snapshot.verificationMode,
        period: snapshot.periodLabel,
        roleScope:
          snapshot.role === 'worker' ? snapshot.department : snapshot.role,
        updates: filtered.slice(0, 14),
        announcements: snapshot.announcements,
      }),
      source: {
        label: `CityPulse Updates (${snapshot.verificationMode})`,
        kind: 'Official / Verified / Demo',
      },
    };
  }

  if (toolName === 'get_area_data') {
    const queryArea = (args.area || snapshot.areaName || '').trim().toLowerCase();
    const requestedSystem = (args.system || '').trim().toLowerCase();

    if (snapshot.role === 'worker') {
      if (
        snapshot.departmentId === 'roads' ||
        snapshot.departmentId === 'transport'
      ) {
        return {
          content: `Data not available: ${snapshot.department} does not have utility consumption or traffic heatmap data. Authorized departments for those datasets are BESCOM (Electricity), BWSSB (Water), and BTP (Traffic).`,
          source: {
            label: `${snapshot.department} (${snapshot.verificationMode})`,
            kind: 'Official / Verified / Demo',
          },
        };
      }

      if (
        requestedSystem &&
        requestedSystem !== snapshot.departmentId &&
        !(requestedSystem === 'power' && snapshot.departmentId === 'electricity')
      ) {
        return {
          content: `Access denied: As a ${snapshot.department} worker, you can only access ${snapshot.departmentId} area data, not ${requestedSystem}.`,
          source: {
            label: `${snapshot.department} (${snapshot.verificationMode})`,
            kind: 'Official / Verified / Demo',
          },
        };
      }
    }

    if (!queryArea) {
      return {
        content: JSON.stringify({
          verificationMode: snapshot.verificationMode,
          period: snapshot.periodLabel,
          note: 'No specific area requested; returning top 5 Bengaluru areas from authorized dataset.',
          areas: snapshot.areasData.slice(0, 5),
        }),
        source: {
          label: `CityPulse Areas (${snapshot.verificationMode})`,
          kind: 'Official / Verified / Demo',
        },
      };
    }

    const match = snapshot.areasData.find(
      (a) =>
        a.areaName.toLowerCase() === queryArea ||
        a.areaId.toLowerCase() === queryArea ||
        a.areaName.toLowerCase().includes(queryArea)
    );

    if (!match) {
      return {
        content: `Data not available for area "${args.area}". This app covers 30 Bengaluru wards (e.g. Indiranagar, Koramangala, Whitefield, Jayanagar, Hebbal). Authoritative source would be BESCOM / BWSSB / BTP.`,
        source: {
          label: `CityPulse 30-Ward Dataset (${snapshot.verificationMode})`,
          kind: 'Official / Verified / Demo',
        },
      };
    }

    const areaAnnouncements = snapshot.announcements.filter((ann) =>
      ann.affectedAreas.toLowerCase().includes(match.areaName.toLowerCase())
    );

    return {
      content: JSON.stringify({
        verificationMode: snapshot.verificationMode,
        period: snapshot.periodLabel,
        area: match,
        relatedAnnouncements: areaAnnouncements,
      }),
      source: {
        label:
          snapshot.role === 'worker'
            ? `${snapshot.department} (${snapshot.verificationMode})`
            : `BESCOM / BWSSB / BTP (${snapshot.verificationMode})`,
        kind: 'Official / Verified / Demo',
      },
    };
  }

  if (toolName === 'get_my_reports') {
    if (snapshot.role === 'worker') {
      return {
        content:
          'Out of scope: Worker accounts should use get_department_issues rather than citizen personal reports.',
        source: {
          label: `${snapshot.department} (${snapshot.verificationMode})`,
          kind: 'Official / Verified / Demo',
        },
      };
    }
    if (snapshot.role === 'guest') {
      return {
        content:
          'Data not available: You are viewing CityPulse in Guest (view-only) mode. Sign in as a Citizen to submit and track your own reports.',
        source: {
          label: `Guest Mode (${snapshot.verificationMode})`,
          kind: 'Official / Verified / Demo',
        },
      };
    }
    return {
      content: JSON.stringify({
        verificationMode: snapshot.verificationMode,
        count: snapshot.myReports.length,
        reports: snapshot.myReports,
      }),
      source: {
        label: `My Reports (${snapshot.verificationMode})`,
        kind: 'Official / Verified / Demo',
      },
    };
  }

  if (toolName === 'get_department_issues') {
    if (snapshot.role !== 'worker') {
      return {
        content:
          'Access restricted: Internal worker issue queues are only available to Municipal Workers. Citizens can check public issues via get_app_updates or their own tickets via get_my_reports.',
        source: {
          label: `CityPulse Citizen Access (${snapshot.verificationMode})`,
          kind: 'Official / Verified / Demo',
        },
      };
    }

    const filter = (args.filter || 'all').toLowerCase();
    let list = [...snapshot.departmentIssues];
    if (filter === 'pending') {
      list = list.filter((i) => i.status !== 'Solved');
    } else if (filter === 'scheduled') {
      list = list.filter((i) => Boolean(i.scheduled));
    } else if (filter === 'oldest') {
      list = list
        .filter((i) => i.status !== 'Solved')
        .sort((a, b) => b.ageHours - a.ageHours);
    }

    return {
      content: JSON.stringify({
        verificationMode: snapshot.verificationMode,
        department: snapshot.department,
        filter,
        totalCount: list.length,
        issues: list.slice(0, 15),
      }),
      source: {
        label: `${snapshot.department} Queue (${snapshot.verificationMode})`,
        kind: 'Official / Verified / Demo',
      },
    };
  }

  return {
    content: `Data not available: Unknown tool '${toolName}'.`,
    source: {
      label: `CityPulse (${snapshot.verificationMode})`,
      kind: 'Official / Verified / Demo',
    },
  };
}

function normalizeCallArgs(rawArgs: Record<string, unknown> | undefined): Record<string, string> {
  if (!rawArgs) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawArgs)) {
    if (v !== undefined && v !== null) {
      out[k] = String(v);
    }
  }
  return out;
}

function toQueuedCalls(calls: FunctionCall[]): QueuedToolCall[] {
  return calls
    .filter((c) => Boolean(c.name))
    .map((c, idx) => ({
      id: c.id || `call_${Date.now()}_${idx}`,
      name: c.name!,
      args: normalizeCallArgs(c.args),
    }));
}

function dedupeSources(sources: NagaraSourceTag[]): NagaraSourceTag[] {
  const map = new Map<string, NagaraSourceTag>();
  for (const s of sources) {
    const key = `${s.kind}:${s.label}:${s.url ?? ''}`;
    if (!map.has(key)) map.set(key, s);
  }
  return Array.from(map.values());
}

export async function handleNagaraChat(
  body: NagaraRequestBody
): Promise<NagaraChatResponse> {
  const snapshot = sanitizeSnapshot(body.appSnapshot);
  const askBeforeExternalTools = body.askBeforeExternalTools !== false;
  const language: SupportedLanguage =
    body.language === 'kn' || body.language === 'hi' ? body.language : 'en';
  const ai = getGeminiClient();
  const systemInstruction = buildSystemPrompt(snapshot, language);

  let contents: Content[];
  let executedParts: Part[] = [];
  let pendingToolCalls: QueuedToolCall[] = [];
  let collectedSources: NagaraSourceTag[] = [];
  let weatherUpdate: { city: string; summary: string } | undefined;

  if (body.approvalDecision) {
    const { approved, toolCallId, pendingState } = body.approvalDecision;
    contents = [...pendingState.contents];
    executedParts = [...(pendingState.executedParts ?? [])];
    collectedSources = [...(pendingState.collectedSources ?? [])];
    weatherUpdate = pendingState.weatherUpdate;

    const currentCall = pendingState.pendingToolCalls.find(
      (c) => c.id === toolCallId
    );
    const remaining = pendingState.pendingToolCalls.filter(
      (c) => c.id !== toolCallId
    );

    if (currentCall) {
      if (!approved) {
        executedParts.push({
          functionResponse: {
            id: currentCall.id,
            name: currentCall.name,
            response: { output: 'Tool call denied by user.' },
          },
        });
      } else if (currentCall.name === 'get_weather') {
        const result = await runWeatherTool(ai, currentCall.args.city);
        collectedSources.push(...result.sources);
        if (result.weatherSummary) {
          weatherUpdate = {
            city: currentCall.args.city || 'Bengaluru',
            summary: result.weatherSummary,
          };
        }
        executedParts.push({
          functionResponse: {
            id: currentCall.id,
            name: currentCall.name,
            response: { output: result.content },
          },
        });
      } else if (currentCall.name === 'get_news') {
        const result = await runNewsTool(ai, currentCall.args.city);
        collectedSources.push(...result.sources);
        executedParts.push({
          functionResponse: {
            id: currentCall.id,
            name: currentCall.name,
            response: { output: result.content },
          },
        });
      }
    }

    pendingToolCalls = remaining;
  } else {
    const history = (body.messages ?? [])
      .slice(-10)
      .filter((m) => m.content && m.content.trim().length > 0);

    contents = history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
  }

  for (let step = 0; step < 6; step++) {
    while (pendingToolCalls.length > 0) {
      const nextCall = pendingToolCalls[0];
      const isExternal =
        nextCall.name === 'get_weather' || nextCall.name === 'get_news';

      if (isExternal && askBeforeExternalTools) {
        const state: PendingLoopState = {
          contents,
          executedParts,
          pendingToolCalls,
          collectedSources,
          weatherUpdate,
        };
        return {
          reply: '',
          status: 'approval_required',
          toolRequests: [
            {
              id: nextCall.id,
              name: nextCall.name as 'get_weather' | 'get_news',
              args: nextCall.args,
            },
          ],
          pendingApproval: {
            toolCallId: nextCall.id,
            toolName: nextCall.name as 'get_weather' | 'get_news',
            displayLabel: nextCall.name === 'get_weather' ? 'Weather' : 'News',
            args: nextCall.args,
            pendingState: state,
          },
        };
      }

      pendingToolCalls = pendingToolCalls.slice(1);

      if (nextCall.name === 'get_weather') {
        const result = await runWeatherTool(ai, nextCall.args.city);
        collectedSources.push(...result.sources);
        if (result.weatherSummary) {
          weatherUpdate = {
            city: nextCall.args.city || 'Bengaluru',
            summary: result.weatherSummary,
          };
        }
        executedParts.push({
          functionResponse: {
            id: nextCall.id,
            name: nextCall.name,
            response: { output: result.content },
          },
        });
      } else if (nextCall.name === 'get_news') {
        const result = await runNewsTool(ai, nextCall.args.city);
        collectedSources.push(...result.sources);
        executedParts.push({
          functionResponse: {
            id: nextCall.id,
            name: nextCall.name,
            response: { output: result.content },
          },
        });
      } else {
        const result = runInternalTool(nextCall.name, nextCall.args, snapshot);
        collectedSources.push(result.source);
        executedParts.push({
          functionResponse: {
            id: nextCall.id,
            name: nextCall.name,
            response: { output: result.content },
          },
        });
      }
    }

    if (executedParts.length > 0) {
      contents = [...contents, { role: 'user', parts: executedParts }];
      executedParts = [];
    }

    const response = await generateWithRetry(ai, {
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: NAGARA_FUNCTION_DECLARATIONS }],
      },
    });

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) {
      contents = [...contents, modelContent];
    }

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      pendingToolCalls = toQueuedCalls(functionCalls);
      continue;
    }

    return {
      status: 'ok',
      reply:
        response.text?.trim() ||
        'Data not available for that query right now.',
      sources: dedupeSources(collectedSources),
      weatherUpdate,
    };
  }

  return {
    status: 'ok',
    reply:
      'I reached the maximum tool steps for this turn. Please rephrase your question concisely.',
    sources: dedupeSources(collectedSources),
    weatherUpdate,
  };
}
