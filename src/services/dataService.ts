import rawAreas from '../data/bangaloreAreas.json';
import rawConsumption from '../data/consumption.json';
import rawIssues from '../data/issues.json';
import rawUsers from '../data/users.json';
import {
  AppUpdateItem,
  BangaloreArea,
  CitizenUserRecord,
  CityIssue,
  ComputedAreaMetric,
  ConsumptionMetric,
  DepartmentAnnouncement,
  DepartmentId,
  DepartmentName,
  DepartmentSummary,
  IssuePriority,
  IssueSchedule,
  IssueStatus,
  MapCorridorOverlay,
  NagaraAppSnapshot,
  NagaraAreaSnapshotItem,
  NagaraIssueSummary,
  PublicCityIssue,
  RawAreaConsumption,
  UserSession,
  WorkerUserRecord,
} from '../types/citypulse';

const STORAGE_KEYS = {
  SESSION: 'citypulse_session_v1',
  ISSUES: 'citypulse_issues_v1',
  CITIZENS: 'citypulse_citizens_v1',
  MY_AREA: 'citypulse_my_area_v1',
};

export const DEPARTMENT_LIST: {
  id: DepartmentId;
  name: DepartmentName;
  shortLabel: string;
}[] = [
  { id: 'electricity', name: 'Electricity - BESCOM', shortLabel: 'Electricity' },
  { id: 'water', name: 'Water - BWSSB', shortLabel: 'Water' },
  { id: 'roads', name: 'Roads - BBMP', shortLabel: 'Roads' },
  { id: 'traffic', name: 'Traffic', shortLabel: 'Traffic' },
  { id: 'transport', name: 'Public Transport - BMTC', shortLabel: 'Transport' },
];

export const REPORT_CATEGORIES: Record<DepartmentId, string[]> = {
  electricity: ['Power cut', 'Transformer fault', 'Voltage fluctuation', 'Streetlight'],
  water: ['Water leakage', 'Low pressure', 'No supply', 'Contaminated water'],
  roads: ['Pothole', 'Streetlight', 'Footpath damage', 'Drainage block'],
  traffic: ['Signal fault', 'Junction bottleneck', 'Missing signage', 'Divider damage'],
  transport: ['Bus shelter', 'Route delay', 'Missing timetable', 'Metro feeder'],
};

const SEEDED_ANNOUNCEMENTS: DepartmentAnnouncement[] = [
  {
    id: 'ann-1',
    departmentId: 'electricity',
    department: 'Electricity - BESCOM',
    title: 'Planned Feeder Maintenance — Whitefield & Hoodi',
    schedule: 'Tomorrow, 10:00 AM – 1:00 PM',
    affectedAreas: 'Whitefield, Mahadevapura, KR Puram',
    summary: 'Transformer oil filtration and 66kV breaker testing on EPIP feeder lines.',
  },
  {
    id: 'ann-2',
    departmentId: 'electricity',
    department: 'Electricity - BESCOM',
    title: 'Solar Microgrid Sync Upgrade — Malleshwaram',
    schedule: 'Today, 2:00 PM – 4:00 PM',
    affectedAreas: 'Malleshwaram, Rajajinagar',
    summary: 'Brief 5-minute changeover while linking new rooftop solar battery banks.',
  },
  {
    id: 'ann-3',
    departmentId: 'water',
    department: 'Water - BWSSB',
    title: 'Cauvery Stage IV Valve Calibration — South Zones',
    schedule: 'Today, 1:30 PM – 4:30 PM',
    affectedAreas: 'JP Nagar, BTM Layout, Banashankari',
    summary: 'Pressure balancing for evening supply; overhead tanks unaffected.',
  },
  {
    id: 'ann-4',
    departmentId: 'water',
    department: 'Water - BWSSB',
    title: 'Morning Supply Schedule Adjustment — East Zone',
    schedule: 'Daily, 6:00 AM – 9:30 AM',
    affectedAreas: 'Indiranagar, Domlur, Ulsoor',
    summary: 'Consistent 54 PSI morning distribution window confirmed for this week.',
  },
  {
    id: 'ann-5',
    departmentId: 'roads',
    department: 'Roads - BBMP',
    title: 'Night Cold-Mix Resurfacing — Koramangala 100ft Rd',
    schedule: 'Tonight, 11:00 PM – 5:00 AM',
    affectedAreas: 'Koramangala, HSR Layout',
    summary: 'Pothole patching and thermoplastic crosswalk repainting overnight.',
  },
  {
    id: 'ann-6',
    departmentId: 'traffic',
    department: 'Traffic',
    title: 'Adaptive Signal Timing Rollout — Outer Ring Road',
    schedule: 'Active this week',
    affectedAreas: 'Marathahalli, Bellandur, Hebbal',
    summary: 'Green-wave signal timing reducing peak wait times by 14%.',
  },
  {
    id: 'ann-7',
    departmentId: 'transport',
    department: 'Public Transport - BMTC',
    title: 'Additional Electric Metro Feeder Shuttles (Route MF-12)',
    schedule: 'Weekdays, 7:30 AM – 10:30 AM & 5:00 PM – 8:30 PM',
    affectedAreas: 'Indiranagar, Whitefield, Electronic City',
    summary: '6-minute headway AC electric buses linking residential lanes to Metro stations.',
  },
];

// Bengaluru Map Corridor Overlays (Red: Construction/Blockage/Accidents · Green: New Roads/Additions)
const MAP_CORRIDOR_OVERLAYS: MapCorridorOverlay[] = [
  {
    id: 'cor-red-silkboard',
    title: 'Silk Board – HSR ORR Flyover Construction',
    category: 'red',
    kind: 'construction',
    metric: 'traffic',
    areaName: 'BTM Layout / HSR Layout',
    badge: 'Construction · +14m',
    summary: 'Red Zone: Double-decker flyover & Metro Phase 2A pier work narrowing ORR lanes.',
    lat: 12.9177,
    lng: 77.6238,
    path: [
      [12.9168, 77.6105],
      [12.9177, 77.6238],
      [12.9145, 77.6380],
      [12.9212, 77.6515],
    ],
  },
  {
    id: 'cor-red-ejipura',
    title: 'Ejipura – Kendriya Sadan Elevated Blockage',
    category: 'red',
    kind: 'blockage',
    metric: 'traffic',
    areaName: 'Koramangala',
    badge: 'Blockage',
    summary: 'Red Zone: Elevated corridor concrete barriers restricting 100ft Inner Ring Road.',
    lat: 12.9375,
    lng: 77.6272,
    path: [
      [12.9462, 77.6215],
      [12.9375, 77.6272],
      [12.9285, 77.6320],
    ],
  },
  {
    id: 'cor-red-hebbal',
    title: 'Hebbal Flyover Loop Construction',
    category: 'red',
    kind: 'construction',
    metric: 'traffic',
    areaName: 'Hebbal',
    badge: 'Construction · +11m',
    summary: 'Red Zone: Airport ramp widening merging 2 lanes before Esteem Mall.',
    lat: 13.0358,
    lng: 77.5970,
    path: [
      [13.0285, 77.5960],
      [13.0358, 77.5970],
      [13.0445, 77.5945],
    ],
  },
  {
    id: 'cor-red-marathahalli',
    title: 'Marathahalli Bridge Viaduct Work',
    category: 'red',
    kind: 'construction',
    metric: 'traffic',
    areaName: 'Marathahalli',
    badge: 'Construction · +9m',
    summary: 'Red Zone: Metro girder crane setup restricting Outer Ring Road service lane.',
    lat: 12.9592,
    lng: 77.6974,
    path: [
      [12.9530, 77.6970],
      [12.9592, 77.6974],
      [12.9665, 77.6982],
    ],
  },
  {
    id: 'cor-red-mysorerd',
    title: 'Nayandahalli Junction Accident Alert',
    category: 'red',
    kind: 'accident',
    metric: 'traffic',
    areaName: 'Vijayanagar / Kengeri',
    badge: 'Accident',
    summary: 'Red Alert: Two-vehicle collision near Nayandahalli flyover; traffic police clearing.',
    lat: 12.9416,
    lng: 77.5236,
  },
  {
    id: 'cor-red-hoodi-water',
    title: 'Hoodi Trunk Water Pipe Excavation',
    category: 'red',
    kind: 'blockage',
    metric: 'water',
    areaName: 'Whitefield / Mahadevapura',
    badge: 'Pipe Work',
    summary: 'Red Zone: BWSSB 900mm valve replacement trench reducing pressure in Hoodi.',
    lat: 12.9926,
    lng: 77.7172,
    path: [
      [12.9905, 77.7120],
      [12.9926, 77.7172],
      [12.9942, 77.7230],
    ],
  },
  {
    id: 'cor-red-epip-elec',
    title: 'Whitefield EPIP 66kV Cable Trenching',
    category: 'red',
    kind: 'construction',
    metric: 'electricity',
    areaName: 'Whitefield',
    badge: 'Grid Work',
    summary: 'Red Zone: BESCOM underground high-voltage cable duct work along EPIP Rd.',
    lat: 12.9765,
    lng: 77.7280,
    path: [
      [12.9735, 77.7220],
      [12.9765, 77.7280],
      [12.9792, 77.7350],
    ],
  },
  {
    id: 'cor-green-hosur',
    title: 'Electronic City – Hosur New Link Bypass',
    category: 'green',
    kind: 'new-road',
    metric: 'traffic',
    areaName: 'Electronic City / Bommanahalli',
    badge: 'New Road Opened',
    summary: 'Green Addition: Newly opened 4-lane bypass relieving Hosur Road peak traffic.',
    lat: 12.8850,
    lng: 77.6350,
    path: [
      [12.8685, 77.6480],
      [12.8850, 77.6350],
      [12.8980, 77.6240],
    ],
  },
  {
    id: 'cor-green-indiranagar',
    title: 'Indiranagar 100ft Rd Cycle & EV Corridor',
    category: 'green',
    kind: 'new-road',
    metric: 'traffic',
    areaName: 'Indiranagar',
    badge: 'New Corridor',
    summary: 'Green Addition: Newly opened protected cycle lane and EV bus priority strip.',
    lat: 12.9719,
    lng: 77.6412,
    path: [
      [12.9635, 77.6412],
      [12.9719, 77.6412],
      [12.9825, 77.6405],
    ],
  },
  {
    id: 'cor-green-yelahanka',
    title: 'Yelahanka – Airport 4-Lane Trumpet Ramp',
    category: 'green',
    kind: 'new-road',
    metric: 'traffic',
    areaName: 'Yelahanka',
    badge: 'New Road · -9m',
    summary: 'Green Addition: Newly opened express ramp cutting Kempegowda Airport travel time.',
    lat: 13.1007,
    lng: 77.5963,
    path: [
      [13.0920, 77.5945],
      [13.1007, 77.5963],
      [13.1180, 77.6050],
    ],
  },
  {
    id: 'cor-green-bellandur-water',
    title: 'Bellandur Lakefront Storm Drain & Eco-Walk',
    category: 'green',
    kind: 'new-addition',
    metric: 'water',
    areaName: 'Bellandur',
    badge: 'New Drain Link',
    summary: 'Green Addition: Newly opened lakefront perimeter walkway and flood culvert.',
    lat: 12.9370,
    lng: 77.6682,
    path: [
      [12.9365, 77.6590],
      [12.9370, 77.6682],
      [12.9382, 77.6775],
    ],
  },
  {
    id: 'cor-green-malleshwaram-solar',
    title: 'Malleshwaram 12 MWh Solar Battery Feeder',
    category: 'green',
    kind: 'new-addition',
    metric: 'electricity',
    areaName: 'Malleshwaram',
    badge: 'New Solar Grid',
    summary: 'Green Addition: Newly commissioned community solar battery storage substation.',
    lat: 13.0068,
    lng: 77.5696,
  },
];

// Internal reactive store
const areas: BangaloreArea[] = rawAreas as BangaloreArea[];
let consumptionList: RawAreaConsumption[] = structuredClone(
  rawConsumption as RawAreaConsumption[]
);
const seededUsers = rawUsers as {
  citizens: CitizenUserRecord[];
  workers: WorkerUserRecord[];
};

function loadIssues(): CityIssue[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.ISSUES);
    if (saved) {
      const parsed = JSON.parse(saved) as CityIssue[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return structuredClone(rawIssues as CityIssue[]);
}

function saveIssues(list: CityIssue[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ISSUES, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function loadCitizens(): CitizenUserRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CITIZENS);
    if (saved) {
      const parsed = JSON.parse(saved) as CitizenUserRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return structuredClone(seededUsers.citizens);
}

function saveCitizens(list: CitizenUserRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CITIZENS, JSON.stringify(list));
  } catch {
    // ignore
  }
}

interface DynamicFeedRecord {
  item: AppUpdateItem;
  reporterId?: string;
  allowedMetric?: ConsumptionMetric;
}

let issuesStore: CityIssue[] = loadIssues();
let citizensStore: CitizenUserRecord[] = loadCitizens();
let lastUpdatedAt: number = Date.now();
let liveEventsLog: DynamicFeedRecord[] = [];
const listeners = new Set<() => void>();

function formatRelativeTime(timestampMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

function pushDynamicEvent(record: DynamicFeedRecord) {
  liveEventsLog = [record, ...liveEventsLog].slice(0, 30);
}

function resolveDepartmentId(
  department?: DepartmentId | DepartmentName | string | null
): DepartmentId | null {
  if (!department) return null;
  const lower = department.toLowerCase();
  const match = DEPARTMENT_LIST.find(
    (d) =>
      d.id === lower ||
      d.name.toLowerCase() === lower ||
      d.shortLabel.toLowerCase() === lower
  );
  return match ? match.id : null;
}

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

// Simulate live updates every 30 seconds (swappable for real BESCOM / BWSSB / BTP API)
let liveTimer: number | null = null;
function ensureLiveTicker() {
  if (liveTimer !== null || typeof window === 'undefined') return;
  liveTimer = window.setInterval(() => {
    simulateConsumptionTick(false);
  }, 30000);
}

function simulateConsumptionTick(isManualRefresh = false) {
  const currentHour = new Date().getHours();
  consumptionList = consumptionList.map((item) => {
    const eDelta = 0.975 + Math.random() * 0.05;
    const wDelta = 0.975 + Math.random() * 0.05;
    const tDelta = 0.96 + Math.random() * 0.08;

    const nextElec = [...item.electricityHourly];
    nextElec[currentHour] = Number(
      Math.max(4, nextElec[currentHour] * eDelta).toFixed(1)
    );

    const nextWater = [...item.waterHourly];
    nextWater[currentHour] = Number(
      Math.max(3, nextWater[currentHour] * wDelta).toFixed(1)
    );

    const nextTraffic = [...item.trafficHourly];
    nextTraffic[currentHour] = Math.min(
      99,
      Math.max(8, Math.round(nextTraffic[currentHour] * tDelta))
    );

    const eIntDelta = Math.round((Math.random() - 0.5) * 4);
    const wIntDelta = Math.round((Math.random() - 0.5) * 4);
    const tIntDelta = Math.round((Math.random() - 0.5) * 4);

    return {
      ...item,
      electricityHourly: nextElec,
      waterHourly: nextWater,
      trafficHourly: nextTraffic,
      electricityIntensity: Math.min(
        99,
        Math.max(15, item.electricityIntensity + eIntDelta)
      ),
      waterIntensity: Math.min(
        99,
        Math.max(15, item.waterIntensity + wIntDelta)
      ),
      trafficIntensity: Math.min(
        99,
        Math.max(15, item.trafficIntensity + tIntDelta)
      ),
    };
  });
  lastUpdatedAt = Date.now();
  if (isManualRefresh) {
    pushDynamicEvent({
      item: {
        id: `refresh-${lastUpdatedAt}`,
        category: 'refresh',
        departmentId: 'city',
        departmentLabel: 'CityPulse Feed',
        summary: 'Live telemetry refreshed across 30 Bengaluru wards.',
        area: 'All Zones',
        timeAgo: 'Just now',
        timestampMs: lastUpdatedAt,
        sourceBadge: 'Demo',
        sourceLabel: 'CityPulse Demo · Now',
        period: 'Now',
        i18nKey: 'nagara:digest.telemetryRefreshed',
        sourceKey: 'demo',
      },
    });
  }
  notifyListeners();
}

ensureLiveTicker();

function stripInternalNotes(issue: CityIssue): PublicCityIssue {
  const { internalNotes: _hidden, ...publicPart } = issue;
  return publicPart;
}

function computeAreaMetrics(): ComputedAreaMetric[] {
  const currentHour = new Date().getHours();
  return areas.map((area) => {
    const c =
      consumptionList.find((x) => x.areaId === area.id) ?? consumptionList[0];

    const eNow = c.electricityHourly[currentHour];
    const eAvg24 =
      c.electricityHourly.reduce((s, v) => s + v, 0) /
      c.electricityHourly.length;
    const eAvg7d =
      c.electricityDaily7d.reduce((s, v) => s + v, 0) /
      c.electricityDaily7d.length;
    const ePeak = Math.max(...c.electricityHourly);
    const ePeakHour = c.electricityHourly.indexOf(ePeak);
    const ePct = Math.round(((eNow - eAvg24) / eAvg24) * 100);

    const wNow = c.waterHourly[currentHour];
    const wAvg24 =
      c.waterHourly.reduce((s, v) => s + v, 0) / c.waterHourly.length;
    const wAvg7d =
      c.waterDaily7d.reduce((s, v) => s + v, 0) / c.waterDaily7d.length;
    const wPeak = Math.max(...c.waterHourly);
    const wPeakHour = c.waterHourly.indexOf(wPeak);
    const wPct = Math.round(((wNow - wAvg24) / wAvg24) * 100);

    const tNow = c.trafficHourly[currentHour];
    const tAvg24 =
      c.trafficHourly.reduce((s, v) => s + v, 0) / c.trafficHourly.length;
    const tAvg7d =
      c.trafficDaily7d.reduce((s, v) => s + v, 0) / c.trafficDaily7d.length;
    const tPeak = Math.max(...c.trafficHourly);
    const tPeakHour = c.trafficHourly.indexOf(tPeak);
    const tPct = Math.round(((tNow - tAvg24) / Math.max(1, tAvg24)) * 100);

    return {
      area,
      electricityNowMW: Number(eNow.toFixed(1)),
      electricity24hAvgMW: Number(eAvg24.toFixed(1)),
      electricity7dAvgMW: Number(eAvg7d.toFixed(1)),
      electricityPeakMW: Number(ePeak.toFixed(1)),
      electricityPeakHour: ePeakHour,
      electricityPctVsAvg: ePct,
      electricityIntensity: c.electricityIntensity,
      electricityHourly: c.electricityHourly,
      electricityDaily7d: c.electricityDaily7d,

      waterNowMLD: Number(wNow.toFixed(1)),
      water24hAvgMLD: Number(wAvg24.toFixed(1)),
      water7dAvgMLD: Number(wAvg7d.toFixed(1)),
      waterPeakMLD: Number(wPeak.toFixed(1)),
      waterPeakHour: wPeakHour,
      waterPctVsAvg: wPct,
      waterIntensity: c.waterIntensity,
      waterHourly: c.waterHourly,
      waterDaily7d: c.waterDaily7d,

      trafficNowPct: Math.round(tNow),
      traffic24hAvgPct: Math.round(tAvg24),
      traffic7dAvgPct: Math.round(tAvg7d),
      trafficPeakPct: Math.round(tPeak),
      trafficPeakHour: tPeakHour,
      trafficPctVsAvg: tPct,
      trafficIntensity: c.trafficIntensity,
      trafficHourly: c.trafficHourly,
      trafficDaily7d: c.trafficDaily7d,
    };
  });
}

export const dataService = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getLastUpdatedAt(): number {
    return lastUpdatedAt;
  },

  refreshLiveSnapshot() {
    simulateConsumptionTick(true);
  },

  getAreas(): BangaloreArea[] {
    return areas;
  },

  getDepartmentList() {
    return DEPARTMENT_LIST;
  },

  getCategoriesForDepartment(deptId: DepartmentId): string[] {
    return REPORT_CATEGORIES[deptId] ?? [];
  },

  getMapCorridorOverlays(metric?: ConsumptionMetric): MapCorridorOverlay[] {
    if (!metric) return MAP_CORRIDOR_OVERLAYS;
    return MAP_CORRIDOR_OVERLAYS.filter((o) => o.metric === metric);
  },

  // ---------------- AUTH & SESSION ----------------
  getSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
      return raw ? (JSON.parse(raw) as UserSession) : null;
    } catch {
      return null;
    }
  },

  saveSession(session: UserSession | null) {
    try {
      if (session) {
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    } catch {
      // ignore
    }
    notifyListeners();
  },

  getDemoCredentials() {
    return {
      citizenPhone: { phone: '9845011223', otp: '123456', name: 'Aarav Sharma' },
      citizenEmail: {
        email: 'ananya@citypulse.in',
        password: 'pulse2026',
        name: 'Ananya Rao',
      },
      workers: seededUsers.workers.map((w) => ({
        employeeId: w.employeeId,
        password: w.password,
        departmentId: w.departmentId,
        department: w.department,
        name: w.name,
      })),
    };
  },

  loginCitizenPhone(
    phoneInput: string,
    otpInput: string
  ): { ok: true; session: UserSession } | { ok: false; error: string; errorKey?: string } {
    const cleanPhone = phoneInput.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      return {
        ok: false,
        error: 'Enter a valid 10-digit mobile number.',
        errorKey: 'errors:invalidPhone',
      };
    }
    if (otpInput.trim() !== '123456') {
      return {
        ok: false,
        error: 'Invalid OTP. Use demo OTP 123456.',
        errorKey: 'errors:invalidOtp',
      };
    }
    const existing = citizensStore.find((c) => c.phone === cleanPhone);
    const citizen: CitizenUserRecord = existing ?? {
      id: `cit-${cleanPhone}`,
      name: 'Bengaluru Citizen',
      phone: cleanPhone,
      areaId: this.getPreferredAreaId(),
    };
    if (!existing) {
      citizensStore = [...citizensStore, citizen];
      saveCitizens(citizensStore);
    }
    const session: UserSession = {
      role: 'citizen',
      userId: citizen.id,
      name: citizen.name,
      contact: citizen.phone ?? cleanPhone,
      areaId: this.getPreferredAreaId() || citizen.areaId,
    };
    this.saveSession(session);
    return { ok: true, session };
  },

  loginCitizenEmail(
    emailInput: string,
    passwordInput: string
  ): { ok: true; session: UserSession } | { ok: false; error: string; errorKey?: string } {
    const cleanEmail = emailInput.trim().toLowerCase();
    const match = citizensStore.find(
      (c) =>
        c.email?.toLowerCase() === cleanEmail && c.password === passwordInput
    );
    if (!match) {
      return {
        ok: false,
        error: 'Incorrect email or password.',
        errorKey: 'errors:invalidEmailPass',
      };
    }
    const session: UserSession = {
      role: 'citizen',
      userId: match.id,
      name: match.name,
      contact: match.email ?? cleanEmail,
      areaId: this.getPreferredAreaId() || match.areaId,
    };
    this.saveSession(session);
    return { ok: true, session };
  },

  signupCitizen(payload: {
    name: string;
    contact: string;
    password: string;
    areaId: string;
  }): { ok: true; session: UserSession } | { ok: false; error: string; errorKey?: string } {
    const name = payload.name.trim();
    const contact = payload.contact.trim();
    if (!name || !contact || payload.password.length < 4) {
      return {
        ok: false,
        error: 'Please enter your name, email/phone, and a password (4+ chars).',
        errorKey: 'errors:signupRequired',
      };
    }
    const isEmail = contact.includes('@');
    const newCitizen: CitizenUserRecord = {
      id: `cit-${Date.now()}`,
      name,
      ...(isEmail
        ? { email: contact.toLowerCase() }
        : { phone: contact.replace(/\D/g, '').slice(-10) }),
      password: payload.password,
      areaId: payload.areaId || 'indiranagar',
    };
    citizensStore = [...citizensStore, newCitizen];
    saveCitizens(citizensStore);
    this.setPreferredAreaId(newCitizen.areaId);

    const session: UserSession = {
      role: 'citizen',
      userId: newCitizen.id,
      name: newCitizen.name,
      contact,
      areaId: newCitizen.areaId,
    };
    this.saveSession(session);
    return { ok: true, session };
  },

  loginAsGuest(): UserSession {
    const session: UserSession = {
      role: 'guest',
      userId: 'guest',
      name: 'Guest Viewer',
      areaId: this.getPreferredAreaId(),
    };
    this.saveSession(session);
    return session;
  },

  loginWorker(payload: {
    employeeId: string;
    password: string;
    departmentId: DepartmentId;
  }): { ok: true; session: UserSession } | { ok: false; error: string; errorKey?: string } {
    const cleanId = payload.employeeId.trim().toUpperCase();
    const worker = seededUsers.workers.find(
      (w) =>
        w.employeeId.toUpperCase() === cleanId &&
        w.password === payload.password &&
        w.departmentId === payload.departmentId
    );
    if (!worker) {
      return {
        ok: false,
        error:
          'Employee ID, password, or selected department did not match our records.',
        errorKey: 'errors:workerAuthFailed',
      };
    }
    const session: UserSession = {
      role: 'worker',
      userId: worker.id,
      employeeId: worker.employeeId,
      name: worker.name,
      departmentId: worker.departmentId,
      department: worker.department,
    };
    this.saveSession(session);
    return { ok: true, session };
  },

  logout() {
    this.saveSession(null);
  },

  getPreferredAreaId(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.MY_AREA) || '';
    } catch {
      return '';
    }
  },

  setPreferredAreaId(areaId: string) {
    try {
      localStorage.setItem(STORAGE_KEYS.MY_AREA, areaId);
      const current = this.getSession();
      if (current && (current.role === 'citizen' || current.role === 'guest')) {
        this.saveSession({ ...current, areaId });
      } else {
        notifyListeners();
      }
    } catch {
      // ignore
    }
  },

  // ---------------- CITIZEN / PUBLIC QUERIES ----------------
  getCitizenSnapshot(session: UserSession | null) {
    if (session?.role === 'worker') {
      throw new Error('Route guard: Workers cannot access citizen city overview.');
    }
    const metrics = computeAreaMetrics();
    const totalElecMW = Number(
      metrics.reduce((s, m) => s + m.electricityNowMW, 0).toFixed(1)
    );
    const totalWaterMLD = Number(
      metrics.reduce((s, m) => s + m.waterNowMLD, 0).toFixed(1)
    );
    const avgTrafficPct = Math.round(
      metrics.reduce((s, m) => s + m.trafficNowPct, 0) / metrics.length
    );

    const topElecAreas = [...metrics]
      .sort((a, b) => b.electricityNowMW - a.electricityNowMW)
      .slice(0, 3);
    const topWaterAreas = [...metrics]
      .sort((a, b) => b.waterNowMLD - a.waterNowMLD)
      .slice(0, 3);
    const topTrafficAreas = [...metrics]
      .sort((a, b) => b.trafficNowPct - a.trafficNowPct)
      .slice(0, 3);

    const recentUpdates = issuesStore.slice(0, 5).map(stripInternalNotes);

    return {
      totalElecMW,
      totalWaterMLD,
      avgTrafficPct,
      topElecAreas,
      topWaterAreas,
      topTrafficAreas,
      allMetrics: metrics,
      recentUpdates,
      lastUpdatedAt,
    };
  },

  getCitizenHeatmapMetrics(session: UserSession | null): ComputedAreaMetric[] {
    if (session?.role === 'worker') {
      throw new Error(
        'Access denied: Workers must use department-scoped consumption service.'
      );
    }
    return computeAreaMetrics();
  },

  getDepartmentSummaries(): DepartmentSummary[] {
    return DEPARTMENT_LIST.map((dept) => {
      const deptIssues = issuesStore.filter((i) => i.departmentId === dept.id);
      const solved = deptIssues.filter((i) => i.status === 'Solved').length;
      const opPct =
        deptIssues.length === 0
          ? 94
          : Math.min(
              98,
              Math.max(76, Math.round(74 + (solved / deptIssues.length) * 24))
            );
      const avgRes =
        dept.id === 'electricity'
          ? 3.2
          : dept.id === 'water'
          ? 4.6
          : dept.id === 'traffic'
          ? 2.4
          : dept.id === 'transport'
          ? 3.8
          : 7.5;
      const crews =
        dept.id === 'electricity'
          ? 18
          : dept.id === 'water'
          ? 15
          : dept.id === 'roads'
          ? 22
          : dept.id === 'traffic'
          ? 12
          : 14;

      return {
        id: dept.id,
        name: dept.name,
        shortLabel: dept.shortLabel,
        statusLabel: opPct >= 85 ? 'Operating smoothly' : 'Elevated load',
        operationalPct: opPct,
        activeCrews: crews,
        avgResolutionHours: avgRes,
      };
    });
  },

  getAnnouncements(departmentId?: DepartmentId | 'all'): DepartmentAnnouncement[] {
    if (!departmentId || departmentId === 'all') return SEEDED_ANNOUNCEMENTS;
    return SEEDED_ANNOUNCEMENTS.filter((a) => a.departmentId === departmentId);
  },

  getPublicIssues(departmentId?: DepartmentId | 'all'): PublicCityIssue[] {
    const filtered =
      !departmentId || departmentId === 'all'
        ? issuesStore
        : issuesStore.filter((i) => i.departmentId === departmentId);
    return filtered.map(stripInternalNotes);
  },

  getMyReports(session: UserSession | null): PublicCityIssue[] {
    if (!session || session.role !== 'citizen') return [];
    return issuesStore
      .filter((i) => i.reporterId === session.userId)
      .map(stripInternalNotes);
  },

  submitCitizenReport(
    session: UserSession | null,
    payload: {
      departmentId: DepartmentId;
      category: string;
      areaId: string;
      description: string;
      photoDataUrl?: string;
      priority?: IssuePriority;
    }
  ): { ok: true; issue: PublicCityIssue } | { ok: false; error: string } {
    if (!session || session.role !== 'citizen') {
      return {
        ok: false,
        error:
          session?.role === 'guest'
            ? 'Guest mode is view-only. Please sign in as a Citizen to submit a report.'
            : 'Only authenticated citizens can submit new reports.',
      };
    }

    const area = areas.find((a) => a.id === payload.areaId);
    const dept = DEPARTMENT_LIST.find((d) => d.id === payload.departmentId);
    if (!area || !dept) {
      return { ok: false, error: 'Please select a valid Bengaluru area and department.' };
    }
    if (!payload.description.trim()) {
      return { ok: false, error: 'Please enter a brief description of the issue.' };
    }

    const id = `CP-${1050 + issuesStore.length}`;
    const newIssue: CityIssue = {
      id,
      departmentId: dept.id,
      department: dept.name,
      category: payload.category,
      areaId: area.id,
      areaName: area.name,
      zone: area.zone,
      title: `${payload.category} — ${area.name}`,
      description: payload.description.trim(),
      photoDataUrl: payload.photoDataUrl,
      status: 'Waiting',
      priority: payload.priority ?? 'Medium',
      createdAt: 'Just now',
      ageHours: 0,
      reporterId: session.userId,
      reporterName: session.name,
      timeline: [
        {
          id: `${id}-t1`,
          actorRole: 'citizen',
          actorName: session.name,
          message: `Submitted ${payload.category.toLowerCase()} report in ${area.name}.`,
          timestamp: 'Just now',
          statusChange: 'Waiting',
        },
      ],
      internalNotes: [],
    };

    issuesStore = [newIssue, ...issuesStore];
    saveIssues(issuesStore);
    pushDynamicEvent({
      reporterId: session.userId,
      item: {
        id: `new-issue-${newIssue.id}`,
        category: 'new_issue',
        departmentId: dept.id,
        departmentLabel: dept.shortLabel,
        summary: `New ${payload.category.toLowerCase()} report (${newIssue.id}): ${newIssue.description.slice(0, 68)}`,
        area: area.name,
        timeAgo: 'Just now',
        timestampMs: Date.now(),
        sourceBadge: 'Demo',
        sourceLabel: `${dept.shortLabel} · Demo`,
        period: 'Now',
        isPersonal: true,
        i18nKey: 'nagara:digest.newReportSummary',
        i18nParams: {
          category: payload.category,
          id: newIssue.id,
          desc: newIssue.description.slice(0, 68),
        },
        areaIds: [area.id],
        sourceKey: 'demo',
      },
    });
    notifyListeners();

    return { ok: true, issue: stripInternalNotes(newIssue) };
  },

  addCitizenComment(
    session: UserSession | null,
    issueId: string,
    message: string
  ): { ok: true; issue: PublicCityIssue } | { ok: false; error: string } {
    if (!session || session.role !== 'citizen') {
      return {
        ok: false,
        error: 'Sign in as a Citizen to post a follow-up comment.',
      };
    }
    const clean = message.trim();
    if (!clean) {
      return { ok: false, error: 'Comment cannot be empty.' };
    }
    const idx = issuesStore.findIndex((i) => i.id === issueId);
    if (idx === -1) {
      return { ok: false, error: 'Issue not found.' };
    }
    const target = issuesStore[idx];
    if (target.reporterId !== session.userId) {
      return { ok: false, error: 'You can only comment on your own reports.' };
    }

    const updated: CityIssue = {
      ...target,
      timeline: [
        ...target.timeline,
        {
          id: `${target.id}-c-${Date.now()}`,
          actorRole: 'citizen',
          actorName: session.name,
          message: clean,
          timestamp: 'Just now',
        },
      ],
    };

    issuesStore = issuesStore.map((i) => (i.id === issueId ? updated : i));
    saveIssues(issuesStore);
    pushDynamicEvent({
      reporterId: target.reporterId,
      item: {
        id: `comment-${target.id}-${Date.now()}`,
        category: 'issue_status',
        departmentId: target.departmentId,
        departmentLabel: target.department.split(' - ')[0],
        summary: `Follow-up added on ${target.id} (${target.category}): "${clean.slice(0, 60)}"`,
        area: target.areaName,
        timeAgo: 'Just now',
        timestampMs: Date.now(),
        sourceBadge: 'Demo',
        sourceLabel: `${target.department.split(' - ')[0]} · Demo`,
        period: 'Now',
        isPersonal: true,
        i18nKey: 'nagara:digest.followUpSummary',
        i18nParams: {
          id: target.id,
          category: target.category,
          msg: clean.slice(0, 60),
        },
        areaIds: [target.areaId],
        sourceKey: 'demo',
      },
    });
    notifyListeners();
    return { ok: true, issue: stripInternalNotes(updated) };
  },

  // ---------------- STRICT WORKER SERVICE ENDPOINTS ----------------
  getWorkerAllowedMetric(session: UserSession | null): ConsumptionMetric | null {
    if (!session || session.role !== 'worker') return null;
    if (session.departmentId === 'electricity') return 'electricity';
    if (session.departmentId === 'water') return 'water';
    if (session.departmentId === 'traffic') return 'traffic';
    return null;
  },

  getWorkerDashboard(session: UserSession | null) {
    if (!session || session.role !== 'worker') {
      throw new Error('Unauthorized: Worker role required.');
    }

    const deptIssues = issuesStore.filter(
      (i) => i.departmentId === session.departmentId
    );
    const waitingCount = deptIssues.filter((i) => i.status === 'Waiting').length;
    const ongoingCount = deptIssues.filter((i) => i.status === 'Ongoing').length;
    const solvedCount = deptIssues.filter((i) => i.status === 'Solved').length;
    const todayNewCount = deptIssues.filter((i) => i.ageHours <= 24).length;

    const oldestUnresolved = [...deptIssues]
      .filter((i) => i.status !== 'Solved')
      .sort((a, b) => b.ageHours - a.ageHours)
      .slice(0, 5);

    const allowedMetric = this.getWorkerAllowedMetric(session);
    const allMetrics = allowedMetric ? computeAreaMetrics() : [];
    const highConsumptionAreas =
      allowedMetric === 'electricity'
        ? [...allMetrics]
            .sort((a, b) => b.electricityNowMW - a.electricityNowMW)
            .slice(0, 5)
        : allowedMetric === 'water'
        ? [...allMetrics]
            .sort((a, b) => b.waterNowMLD - a.waterNowMLD)
            .slice(0, 5)
        : allowedMetric === 'traffic'
        ? [...allMetrics]
            .sort((a, b) => b.trafficNowPct - a.trafficNowPct)
            .slice(0, 5)
        : [];

    return {
      departmentId: session.departmentId,
      department: session.department,
      waitingCount,
      ongoingCount,
      solvedCount,
      todayNewCount,
      oldestUnresolved,
      allowedMetric,
      highConsumptionAreas,
      lastUpdatedAt,
    };
  },

  getWorkerIssues(session: UserSession | null): CityIssue[] {
    if (!session || session.role !== 'worker') {
      throw new Error('Unauthorized: Worker role required.');
    }
    return issuesStore.filter((i) => i.departmentId === session.departmentId);
  },

  getWorkerHeatmapData(
    session: UserSession | null,
    requestedMetric?: ConsumptionMetric
  ): { metric: ConsumptionMetric; metrics: ComputedAreaMetric[] } {
    if (!session || session.role !== 'worker') {
      throw new Error('Unauthorized: Worker role required.');
    }
    const allowedMetric = this.getWorkerAllowedMetric(session);
    if (!allowedMetric) {
      throw new Error(
        `Access denied: ${session.department} does not have consumption/traffic heatmap access.`
      );
    }
    if (requestedMetric && requestedMetric !== allowedMetric) {
      throw new Error(
        `Access denied: ${session.department} workers cannot access ${requestedMetric} data.`
      );
    }
    return {
      metric: allowedMetric,
      metrics: computeAreaMetrics(),
    };
  },

  updateIssueAsWorker(
    session: UserSession | null,
    issueId: string,
    action: {
      reply?: string;
      status?: IssueStatus;
      schedule?: IssueSchedule;
      internalNote?: string;
    }
  ): { ok: true; issue: CityIssue } | { ok: false; error: string } {
    if (!session || session.role !== 'worker') {
      return { ok: false, error: 'Unauthorized: Worker authentication required.' };
    }

    const existing = issuesStore.find((i) => i.id === issueId);
    if (!existing) {
      return { ok: false, error: 'Issue not found.' };
    }

    // STRICT department enforcement at service layer
    if (existing.departmentId !== session.departmentId) {
      return {
        ok: false,
        error: `Forbidden: ${session.department} workers cannot modify ${existing.department} issues.`,
      };
    }

    const nextTimeline = [...existing.timeline];
    const nextNotes = [...existing.internalNotes];
    let nextStatus = existing.status;
    let nextScheduled = existing.scheduled;

    if (action.status && action.status !== existing.status) {
      nextStatus = action.status;
      if (nextStatus !== 'Ongoing') {
        nextScheduled = undefined;
      }
      nextTimeline.push({
        id: `${existing.id}-s-${Date.now()}`,
        actorRole: 'worker',
        actorName: `${session.name} (${session.department.split(' - ')[0]})`,
        message: `Status updated to ${nextStatus}.`,
        timestamp: 'Just now',
        statusChange: nextStatus,
      });
    }

    if (action.schedule) {
      nextStatus = 'Ongoing';
      nextScheduled = action.schedule;
      const eta = action.schedule.etaNote
        ? ` — ${action.schedule.etaNote}`
        : '';
      nextTimeline.push({
        id: `${existing.id}-sch-${Date.now()}`,
        actorRole: 'worker',
        actorName: `${session.name} (${session.department.split(' - ')[0]})`,
        message: `Work scheduled for ${action.schedule.date} at ${action.schedule.time}${eta}`,
        timestamp: 'Just now',
        statusChange: 'Ongoing',
        isSchedule: true,
      });
    }

    if (action.reply && action.reply.trim()) {
      nextTimeline.push({
        id: `${existing.id}-r-${Date.now()}`,
        actorRole: 'worker',
        actorName: `${session.name} (${session.department.split(' - ')[0]})`,
        message: action.reply.trim(),
        timestamp: 'Just now',
      });
    }

    if (action.internalNote && action.internalNote.trim()) {
      nextNotes.push({
        id: `${existing.id}-in-${Date.now()}`,
        authorName: session.name,
        text: action.internalNote.trim(),
        timestamp: 'Just now',
      });
    }

    const updated: CityIssue = {
      ...existing,
      status: nextStatus,
      scheduled: nextScheduled,
      timeline: nextTimeline,
      internalNotes: nextNotes,
    };

    issuesStore = issuesStore.map((i) => (i.id === issueId ? updated : i));
    saveIssues(issuesStore);

    const nowMs = Date.now();
    const deptShort = existing.department.split(' - ')[0];
    if (action.schedule) {
      pushDynamicEvent({
        reporterId: existing.reporterId,
        item: {
          id: `sched-${existing.id}-${nowMs}`,
          category: 'issue_status',
          departmentId: existing.departmentId,
          departmentLabel: deptShort,
          summary: `${existing.id} scheduled for ${action.schedule.date} at ${action.schedule.time} (Ongoing).`,
          area: existing.areaName,
          timeAgo: 'Just now',
          timestampMs: nowMs,
          sourceBadge: 'Official',
          sourceLabel: `${deptShort} · Demo`,
          period: action.schedule.date,
          isPersonal: true,
          i18nKey: 'nagara:digest.deptScheduled',
          i18nParams: {
            id: existing.id,
            date: action.schedule.date,
            time: action.schedule.time,
          },
          areaIds: [existing.areaId],
          sourceKey: 'official',
        },
      });
    } else if (action.status && action.status !== existing.status) {
      pushDynamicEvent({
        reporterId: existing.reporterId,
        item: {
          id: `status-${existing.id}-${nextStatus}-${nowMs}`,
          category: 'issue_status',
          departmentId: existing.departmentId,
          departmentLabel: deptShort,
          summary: `${existing.id} (${existing.category}) moved from ${existing.status} to ${nextStatus}.`,
          area: existing.areaName,
          timeAgo: 'Just now',
          timestampMs: nowMs,
          sourceBadge: 'Official',
          sourceLabel: `${deptShort} · Demo`,
          period: 'Now',
          isPersonal: true,
          i18nKey: 'nagara:digest.statusChangedSummary',
          i18nParams: {
            id: existing.id,
            category: existing.category,
            from: existing.status,
            to: nextStatus,
          },
          areaIds: [existing.areaId],
          sourceKey: 'official',
        },
      });
    }
    if (action.reply && action.reply.trim()) {
      pushDynamicEvent({
        reporterId: existing.reporterId,
        item: {
          id: `reply-${existing.id}-${nowMs}`,
          category: 'worker_reply',
          departmentId: existing.departmentId,
          departmentLabel: deptShort,
          summary: `Worker reply on ${existing.id}: "${action.reply.trim().slice(0, 72)}"`,
          area: existing.areaName,
          timeAgo: 'Just now',
          timestampMs: nowMs,
          sourceBadge: 'Official',
          sourceLabel: `${deptShort} · Demo`,
          period: 'Now',
          isPersonal: true,
          i18nKey: 'nagara:digest.workerReplySummary',
          i18nParams: {
            id: existing.id,
            msg: action.reply.trim().slice(0, 72),
          },
          areaIds: [existing.areaId],
          sourceKey: 'official',
        },
      });
    }

    notifyListeners();
    return { ok: true, issue: updated };
  },

  // ---------------- NAGARAAI UPDATES FEED & SCOPED SNAPSHOT ----------------
  recordWeatherUpdate(city: string, summary: string) {
    const nowMs = Date.now();
    pushDynamicEvent({
      item: {
        id: `weather-${city.toLowerCase()}-${nowMs}`,
        category: 'weather',
        departmentId: 'weather',
        departmentLabel: 'Weather',
        summary,
        area: city,
        timeAgo: 'Just now',
        timestampMs: nowMs,
        sourceBadge: 'External / Live',
        sourceLabel: 'Google Search · External / Live',
        period: 'Now',
        sourceKey: 'externalLive',
      },
    });
    notifyListeners();
  },

  getUpdatesFeed(
    role: 'citizen' | 'guest' | 'worker',
    department?: DepartmentId | DepartmentName | string | null,
    userId?: string
  ): AppUpdateItem[] {
    const deptId = resolveDepartmentId(department);
    const isWorker = role === 'worker';
    const feed: AppUpdateItem[] = [];
    const seenIds = new Set<string>();

    const addItem = (item: AppUpdateItem) => {
      if (seenIds.has(item.id)) return;
      seenIds.add(item.id);
      feed.push(item);
    };

    // 1. Live session events (status updates, replies, new reports, weather, refreshes)
    liveEventsLog.forEach((rec) => {
      const ev = rec.item;
      if (isWorker) {
        if (!deptId) return;
        // Strict worker scoping: only their own department, or city/weather if relevant?
        // Keep worker feed strictly scoped to their department + weather/refresh events ONLY for their department
        if (ev.departmentId !== deptId && ev.departmentId !== 'weather') {
          return;
        }
        addItem({
          ...ev,
          isPersonal: false,
          timeAgo: formatRelativeTime(ev.timestampMs),
        });
      } else {
        const isMine = Boolean(userId && rec.reporterId === userId);
        addItem({
          ...ev,
          isPersonal: isMine,
          timeAgo: formatRelativeTime(ev.timestampMs),
        });
      }
    });

    // 2. Personal Citizen Report Updates (Citizen only)
    if (role === 'citizen' && userId) {
      issuesStore
        .filter((i) => i.reporterId === userId)
        .slice(0, 4)
        .forEach((issue, idx) => {
          const deptShort = issue.department.split(' - ')[0];
          const latestWorkerEvt = [...issue.timeline]
            .reverse()
            .find((t) => t.actorRole === 'worker');
          const summary = issue.scheduled
            ? `Your report ${issue.id} is Scheduled (${issue.scheduled.date} ${issue.scheduled.time})`
            : latestWorkerEvt
            ? `Update on your report ${issue.id}: ${latestWorkerEvt.message}`
            : `Your report ${issue.id} (${issue.category}) is currently ${issue.status}`;

          addItem({
            id: `personal-${issue.id}-${issue.status}`,
            category: latestWorkerEvt ? 'worker_reply' : 'issue_status',
            departmentId: issue.departmentId,
            departmentLabel: deptShort,
            summary,
            area: issue.areaName,
            timeAgo: issue.createdAt,
            timestampMs: Date.now() - (idx + 1) * 60000,
            sourceBadge: 'Verified',
            sourceLabel: `${deptShort} · Demo`,
            period: issue.scheduled?.date ?? 'Now',
            isPersonal: true,
            areaIds: [issue.areaId],
            sourceKey: 'verified',
            ...(issue.scheduled
              ? {
                  i18nKey: 'nagara:digest.reportScheduled',
                  i18nParams: {
                    id: issue.id,
                    date: issue.scheduled.date,
                    time: issue.scheduled.time,
                  },
                }
              : !latestWorkerEvt
              ? {
                  i18nKey: 'nagara:digest.reportStatus',
                  i18nParams: {
                    id: issue.id,
                    category: issue.category,
                    status: issue.status,
                  },
                }
              : {}),
          });
        });
    }

    // 3. Worker SLA & Oldest-Unresolved Warnings + Department Queue
    if (isWorker && deptId) {
      const deptIssues = issuesStore.filter((i) => i.departmentId === deptId);
      const deptShort =
        DEPARTMENT_LIST.find((d) => d.id === deptId)?.shortLabel ?? deptId;

      const oldest = [...deptIssues]
        .filter((i) => i.status !== 'Solved')
        .sort((a, b) => b.ageHours - a.ageHours)
        .slice(0, 2);

      oldest.forEach((issue, idx) => {
        if (issue.ageHours >= 24) {
          addItem({
            id: `sla-${issue.id}`,
            category: 'sla_warning',
            departmentId: deptId,
            departmentLabel: deptShort,
            summary: `SLA Warning: ${issue.id} (${issue.category}) unresolved for ${issue.ageHours}h [${issue.priority}]`,
            area: issue.areaName,
            timeAgo: `${issue.ageHours}h old`,
            timestampMs: Date.now() - (idx + 2) * 120000,
            sourceBadge: 'Official',
            sourceLabel: `${deptShort} Queue · Demo`,
            period: 'SLA > 24h',
            areaIds: [issue.areaId],
            sourceKey: 'official',
            i18nKey: 'nagara:digest.slaWarning',
            i18nParams: {
              id: issue.id,
              category: issue.category,
              hours: issue.ageHours,
              priority: issue.priority,
            },
          });
        }
      });

      deptIssues.slice(0, 4).forEach((issue, idx) => {
        addItem({
          id: `dept-issue-${issue.id}-${issue.status}`,
          category: issue.scheduled ? 'issue_status' : 'new_issue',
          departmentId: deptId,
          departmentLabel: deptShort,
          summary: issue.scheduled
            ? `${issue.id} Ongoing · Scheduled ${issue.scheduled.date} ${issue.scheduled.time}`
            : `${issue.id}: ${issue.title} (${issue.status})`,
          area: issue.areaName,
          timeAgo: issue.createdAt,
          timestampMs: Date.now() - (idx + 4) * 180000,
          sourceBadge: 'Demo',
          sourceLabel: `${deptShort} · Demo`,
          period: 'Now',
          areaIds: [issue.areaId],
          sourceKey: 'demo',
          ...(issue.scheduled
            ? {
                i18nKey: 'nagara:digest.deptScheduled',
                i18nParams: {
                  id: issue.id,
                  date: issue.scheduled.date,
                  time: issue.scheduled.time,
                },
              }
            : {
                i18nKey: 'nagara:digest.deptIssue',
                i18nParams: {
                  id: issue.id,
                  title: issue.title,
                  status: issue.status,
                },
              }),
        });
      });
    }

    // 4. Announcements, Planned Outages & Supply Schedules (role-scoped)
    const scopedAnnouncements = isWorker
      ? deptId
        ? SEEDED_ANNOUNCEMENTS.filter((a) => a.departmentId === deptId)
        : []
      : SEEDED_ANNOUNCEMENTS;

    scopedAnnouncements.forEach((ann, idx) => {
      const deptShort = ann.department.split(' - ')[0];
      const isOutageOrSchedule =
        ann.title.toLowerCase().includes('maintenance') ||
        ann.title.toLowerCase().includes('supply') ||
        ann.title.toLowerCase().includes('calibration');

      addItem({
        id: `ann-${ann.id}`,
        category: isOutageOrSchedule ? 'outage' : 'announcement',
        departmentId: ann.departmentId,
        departmentLabel: deptShort,
        summary: `${ann.title} (${ann.schedule})`,
        area: ann.affectedAreas,
        timeAgo: 'Scheduled',
        timestampMs: Date.now() - (idx + 6) * 300000,
        sourceBadge: 'Official',
        sourceLabel: `${deptShort} Notice · Demo`,
        period: ann.schedule,
        sourceKey: 'official',
      });
    });

    // 5. Public Issues Snapshot (Citizen / Guest across all departments)
    if (!isWorker) {
      issuesStore.slice(0, 4).forEach((issue, idx) => {
        const deptShort = issue.department.split(' - ')[0];
        addItem({
          id: `pub-issue-${issue.id}-${issue.status}`,
          category: 'new_issue',
          departmentId: issue.departmentId,
          departmentLabel: deptShort,
          summary: `${issue.id}: ${issue.category} reported — ${issue.status}`,
          area: issue.areaName,
          timeAgo: issue.createdAt,
          timestampMs: Date.now() - (idx + 10) * 300000,
          sourceBadge: 'Demo',
          sourceLabel: `${deptShort} · Demo`,
          period: 'Now',
          areaIds: [issue.areaId],
          sourceKey: 'demo',
          i18nKey: 'nagara:digest.publicIssue',
          i18nParams: {
            id: issue.id,
            category: issue.category,
            status: issue.status,
          },
        });
      });
    }

    // 6. Heatmap Highlights (Highest & Lowest with period) - strictly department-scoped for workers
    const metrics = computeAreaMetrics();
    const allowElec = !isWorker || deptId === 'electricity';
    const allowWater = !isWorker || deptId === 'water';
    const allowTraffic = !isWorker || deptId === 'traffic';

    if (allowElec && metrics.length > 0) {
      const byElec = [...metrics].sort(
        (a, b) => b.electricityNowMW - a.electricityNowMW
      );
      const hi = byElec[0];
      const lo = byElec[byElec.length - 1];
      addItem({
        id: `heatmap-elec-${hi.area.id}-${lo.area.id}`,
        category: 'heatmap',
        departmentId: 'electricity',
        departmentLabel: 'Electricity',
        summary: `Power peak: ${hi.area.name} (${hi.electricityNowMW} MW) · Lowest: ${lo.area.name} (${lo.electricityNowMW} MW)`,
        area: `${hi.area.name} / ${lo.area.name}`,
        timeAgo: formatRelativeTime(lastUpdatedAt),
        timestampMs: lastUpdatedAt,
        sourceBadge: 'Demo',
        sourceLabel: 'BESCOM Heatmap · Demo',
        period: 'Now (Live)',
        areaIds: [hi.area.id, lo.area.id],
        sourceKey: 'demo',
        i18nKey: 'nagara:digest.powerPeak',
        i18nParams: {
          highAreaId: hi.area.id,
          highArea: hi.area.name,
          highVal: hi.electricityNowMW,
          lowAreaId: lo.area.id,
          lowArea: lo.area.name,
          lowVal: lo.electricityNowMW,
        },
      });
    }

    if (allowWater && metrics.length > 0) {
      const byWater = [...metrics].sort((a, b) => b.waterNowMLD - a.waterNowMLD);
      const hi = byWater[0];
      const lo = byWater[byWater.length - 1];
      addItem({
        id: `heatmap-water-${hi.area.id}-${lo.area.id}`,
        category: 'heatmap',
        departmentId: 'water',
        departmentLabel: 'Water',
        summary: `Water highest: ${hi.area.name} (${hi.waterNowMLD} MLD) · Lowest: ${lo.area.name} (${lo.waterNowMLD} MLD)`,
        area: `${hi.area.name} / ${lo.area.name}`,
        timeAgo: formatRelativeTime(lastUpdatedAt),
        timestampMs: lastUpdatedAt,
        sourceBadge: 'Demo',
        sourceLabel: 'BWSSB Heatmap · Demo',
        period: 'Now (Live)',
        areaIds: [hi.area.id, lo.area.id],
        sourceKey: 'demo',
        i18nKey: 'nagara:digest.waterPeak',
        i18nParams: {
          highAreaId: hi.area.id,
          highArea: hi.area.name,
          highVal: hi.waterNowMLD,
          lowAreaId: lo.area.id,
          lowArea: lo.area.name,
          lowVal: lo.waterNowMLD,
        },
      });
    }

    if (allowTraffic && metrics.length > 0) {
      const byTraffic = [...metrics].sort(
        (a, b) => b.trafficNowPct - a.trafficNowPct
      );
      const hi = byTraffic[0];
      const lo = byTraffic[byTraffic.length - 1];
      addItem({
        id: `heatmap-traffic-${hi.area.id}-${lo.area.id}`,
        category: 'heatmap',
        departmentId: 'traffic',
        departmentLabel: 'Traffic',
        summary: `Heaviest traffic: ${hi.area.name} (${hi.trafficNowPct}%) · Smoothest: ${lo.area.name} (${lo.trafficNowPct}%)`,
        area: `${hi.area.name} / ${lo.area.name}`,
        timeAgo: formatRelativeTime(lastUpdatedAt),
        timestampMs: lastUpdatedAt,
        sourceBadge: 'Demo',
        sourceLabel: 'BTP Traffic · Demo',
        period: 'Now (Live)',
        areaIds: [hi.area.id, lo.area.id],
        sourceKey: 'demo',
        i18nKey: 'nagara:digest.trafficPeak',
        i18nParams: {
          highAreaId: hi.area.id,
          highArea: hi.area.name,
          highVal: hi.trafficNowPct,
          lowAreaId: lo.area.id,
          lowArea: lo.area.name,
          lowVal: lo.trafficNowPct,
        },
      });
    }

    // 7. Data Sync / Import Timestamp Event
    if (!isWorker) {
      addItem({
        id: `sync-snapshot`,
        category: 'refresh',
        departmentId: 'city',
        departmentLabel: 'CityPulse',
        summary: `30-ward Bengaluru telemetry active (30s live cycle)`,
        area: 'Bengaluru',
        timeAgo: formatRelativeTime(lastUpdatedAt),
        timestampMs: lastUpdatedAt - 5000,
        sourceBadge: 'Demo',
        sourceLabel: 'CityPulse · Demo',
        period: 'Now',
        sourceKey: 'demo',
        i18nKey: 'nagara:digest.telemetryActive',
      });
    }

    return feed.sort((a, b) => b.timestampMs - a.timestampMs);
  },

  getNagaraAppSnapshot(session: UserSession): NagaraAppSnapshot {
    const isWorker = session.role === 'worker';
    const workerDeptId = isWorker ? session.departmentId : undefined;
    const allowedMetric = isWorker ? this.getWorkerAllowedMetric(session) : null;

    const metrics = computeAreaMetrics();
    const areasData: NagaraAreaSnapshotItem[] = [];

    if (!isWorker || allowedMetric !== null) {
      metrics.forEach((m) => {
        const entry: NagaraAreaSnapshotItem = {
          areaId: m.area.id,
          areaName: m.area.name,
          zone: m.area.zone,
        };
        if (!isWorker || allowedMetric === 'electricity') {
          entry.electricityNowMW = m.electricityNowMW;
          entry.electricity24hAvgMW = m.electricity24hAvgMW;
          entry.electricityPeakMW = m.electricityPeakMW;
          entry.electricityPeakHour = m.electricityPeakHour;
          entry.electricityIntensity = m.electricityIntensity;
          entry.electricitySource = 'BESCOM (Demo, Now / 24h)';
        }
        if (!isWorker || allowedMetric === 'water') {
          entry.waterNowMLD = m.waterNowMLD;
          entry.water24hAvgMLD = m.water24hAvgMLD;
          entry.waterPeakMLD = m.waterPeakMLD;
          entry.waterPeakHour = m.waterPeakHour;
          entry.waterIntensity = m.waterIntensity;
          entry.waterSource = 'BWSSB (Demo, Now / 24h)';
        }
        if (!isWorker || allowedMetric === 'traffic') {
          entry.trafficNowPct = m.trafficNowPct;
          entry.traffic24hAvgPct = m.traffic24hAvgPct;
          entry.trafficPeakPct = m.trafficPeakPct;
          entry.trafficIntensity = m.trafficIntensity;
          entry.trafficSource = 'BTP Traffic (Demo, Now / 24h)';
        }
        areasData.push(entry);
      });
    }

    const toIssueSummary = (
      i: CityIssue,
      userId: string
    ): NagaraIssueSummary => {
      const latestWorkerEvt = [...i.timeline]
        .reverse()
        .find((t) => t.actorRole === 'worker');
      return {
        id: i.id,
        departmentId: i.departmentId,
        department: i.department,
        category: i.category,
        areaId: i.areaId,
        areaName: i.areaName,
        title: i.title,
        status: i.status,
        priority: i.priority,
        createdAt: i.createdAt,
        ageHours: i.ageHours,
        scheduled: i.scheduled,
        latestReply: latestWorkerEvt?.message,
        isMine: i.reporterId === userId,
      };
    };

    const myReports =
      session.role === 'citizen'
        ? issuesStore
            .filter((i) => i.reporterId === session.userId)
            .map((i) => toIssueSummary(i, session.userId))
        : [];

    const departmentIssues = isWorker
      ? issuesStore
          .filter((i) => i.departmentId === workerDeptId)
          .map((i) => toIssueSummary(i, session.userId))
      : issuesStore.slice(0, 15).map((i) => toIssueSummary(i, session.userId));

    const announcements = isWorker
      ? SEEDED_ANNOUNCEMENTS.filter((a) => a.departmentId === workerDeptId)
      : SEEDED_ANNOUNCEMENTS;

    const citizenAreaId =
      session.role === 'citizen' || session.role === 'guest'
        ? session.areaId
        : undefined;
    const areaObj = citizenAreaId
      ? areas.find((a) => a.id === citizenAreaId)
      : undefined;

    return {
      role: session.role,
      userId: session.userId,
      userName: session.name,
      departmentId: workerDeptId,
      department: isWorker ? session.department : undefined,
      areaId: areaObj?.id,
      areaName: areaObj?.name,
      verificationMode: 'Demo',
      periodLabel: `Live (${new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })})`,
      lastUpdatedIso: new Date(lastUpdatedAt).toISOString(),
      updatesFeed: this.getUpdatesFeed(
        session.role,
        workerDeptId ?? null,
        session.userId
      ),
      announcements,
      areasData,
      myReports,
      departmentIssues,
    };
  },
};
