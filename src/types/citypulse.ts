export type Zone = 'North' | 'South' | 'East' | 'West' | 'Central';

export type DepartmentId =
  | 'electricity'
  | 'water'
  | 'roads'
  | 'traffic'
  | 'transport';

export type DepartmentName =
  | 'Electricity - BESCOM'
  | 'Water - BWSSB'
  | 'Roads - BBMP'
  | 'Traffic'
  | 'Public Transport - BMTC';

export type ConsumptionMetric = 'electricity' | 'water' | 'traffic';
export type TimeRange = 'now' | '24h' | '7d';
export type HeatmapDisplayMode = 'map' | 'grid' | 'matrix';

export type IssueStatus = 'Waiting' | 'Ongoing' | 'Solved';
export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type CitizenTab = 'home' | 'heatmap' | 'departments' | 'report';
export type WorkerTab = 'dashboard' | 'issues' | 'data';

export interface BangaloreArea {
  id: string;
  name: string;
  zone: Zone;
  population: number;
  lat: number;
  lng: number;
}

export interface RawAreaConsumption {
  areaId: string;
  electricityHourly: number[]; // 24 values in MW
  waterHourly: number[]; // 24 values in MLD
  trafficHourly: number[]; // 24 values in % congestion (0-100)
  electricityDaily7d: number[]; // 7 daily averages in MW
  waterDaily7d: number[]; // 7 daily totals in MLD
  trafficDaily7d: number[]; // 7 daily averages in % congestion
  electricityIntensity: number; // 0-100
  waterIntensity: number; // 0-100
  trafficIntensity: number; // 0-100
}

export interface ComputedAreaMetric {
  area: BangaloreArea;
  electricityNowMW: number;
  electricity24hAvgMW: number;
  electricity7dAvgMW: number;
  electricityPeakMW: number;
  electricityPeakHour: number;
  electricityPctVsAvg: number;
  electricityIntensity: number;
  electricityHourly: number[];
  electricityDaily7d: number[];

  waterNowMLD: number;
  water24hAvgMLD: number;
  water7dAvgMLD: number;
  waterPeakMLD: number;
  waterPeakHour: number;
  waterPctVsAvg: number;
  waterIntensity: number;
  waterHourly: number[];
  waterDaily7d: number[];

  trafficNowPct: number;
  traffic24hAvgPct: number;
  traffic7dAvgPct: number;
  trafficPeakPct: number;
  trafficPeakHour: number;
  trafficPctVsAvg: number;
  trafficIntensity: number;
  trafficHourly: number[];
  trafficDaily7d: number[];
}

export interface MapCorridorOverlay {
  id: string;
  title: string;
  category: 'red' | 'green';
  kind: 'construction' | 'blockage' | 'accident' | 'new-road' | 'new-addition';
  metric: ConsumptionMetric;
  areaName: string;
  badge: string;
  summary: string;
  lat: number;
  lng: number;
  path?: [number, number][];
}

export interface IssueSchedule {
  date: string;
  time: string;
  etaNote?: string;
}

export interface IssueTimelineEvent {
  id: string;
  actorRole: 'citizen' | 'worker' | 'system';
  actorName: string;
  message: string;
  timestamp: string;
  statusChange?: IssueStatus;
  isSchedule?: boolean;
}

export interface InternalNote {
  id: string;
  authorName: string;
  text: string;
  timestamp: string;
}

export interface CityIssue {
  id: string;
  departmentId: DepartmentId;
  department: DepartmentName;
  category: string;
  areaId: string;
  areaName: string;
  zone: Zone;
  title: string;
  description: string;
  photoDataUrl?: string;
  status: IssueStatus;
  scheduled?: IssueSchedule;
  priority: IssuePriority;
  createdAt: string;
  ageHours: number;
  reporterId: string;
  reporterName: string;
  timeline: IssueTimelineEvent[];
  internalNotes: InternalNote[];
}

export type PublicCityIssue = Omit<CityIssue, 'internalNotes'>;

export interface DepartmentAnnouncement {
  id: string;
  departmentId: DepartmentId;
  department: DepartmentName;
  title: string;
  schedule: string;
  affectedAreas: string;
  summary: string;
}

export interface DepartmentSummary {
  id: DepartmentId;
  name: DepartmentName;
  shortLabel: string;
  statusLabel: string;
  operationalPct: number;
  activeCrews: number;
  avgResolutionHours: number;
}

export interface CitizenUserRecord {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  password?: string;
  areaId: string;
}

export interface WorkerUserRecord {
  id: string;
  employeeId: string;
  password: string;
  name: string;
  departmentId: DepartmentId;
  department: DepartmentName;
}

export type UserSession =
  | {
      role: 'citizen';
      userId: string;
      name: string;
      contact: string;
      areaId: string;
    }
  | {
      role: 'guest';
      userId: 'guest';
      name: 'Guest Viewer';
      areaId: string;
    }
  | {
      role: 'worker';
      userId: string;
      employeeId: string;
      name: string;
      departmentId: DepartmentId;
      department: DepartmentName;
    };

export type UpdateSourceBadge =
  | 'Official'
  | 'Verified'
  | 'Demo'
  | 'External / Live';

export type UpdateCategory =
  | 'announcement'
  | 'outage'
  | 'issue_status'
  | 'worker_reply'
  | 'new_issue'
  | 'heatmap'
  | 'weather'
  | 'refresh'
  | 'sla_warning';

export interface AppUpdateItem {
  id: string;
  category: UpdateCategory;
  departmentId: DepartmentId | 'city' | 'weather';
  departmentLabel: string;
  summary: string;
  area: string;
  timeAgo: string;
  timestampMs: number;
  sourceBadge: UpdateSourceBadge;
  sourceLabel: string;
  period?: string;
  isPersonal?: boolean;
  i18nKey?: string;
  i18nParams?: Record<string, string | number>;
  areaIds?: string[];
  sourceKey?: 'official' | 'verified' | 'demo' | 'externalLive';
}

export interface NagaraAreaSnapshotItem {
  areaId: string;
  areaName: string;
  zone: Zone;
  electricityNowMW?: number;
  electricity24hAvgMW?: number;
  electricityPeakMW?: number;
  electricityPeakHour?: number;
  electricityIntensity?: number;
  electricitySource?: string;
  waterNowMLD?: number;
  water24hAvgMLD?: number;
  waterPeakMLD?: number;
  waterPeakHour?: number;
  waterIntensity?: number;
  waterSource?: string;
  trafficNowPct?: number;
  traffic24hAvgPct?: number;
  trafficPeakPct?: number;
  trafficIntensity?: number;
  trafficSource?: string;
}

export interface NagaraIssueSummary {
  id: string;
  departmentId: DepartmentId;
  department: DepartmentName;
  category: string;
  areaId: string;
  areaName: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  createdAt: string;
  ageHours: number;
  scheduled?: IssueSchedule;
  latestReply?: string;
  isMine?: boolean;
}

export interface NagaraAppSnapshot {
  role: 'citizen' | 'guest' | 'worker';
  userId: string;
  userName: string;
  departmentId?: DepartmentId;
  department?: DepartmentName;
  areaId?: string;
  areaName?: string;
  verificationMode: 'Demo';
  periodLabel: string;
  lastUpdatedIso: string;
  updatesFeed: AppUpdateItem[];
  announcements: DepartmentAnnouncement[];
  areasData: NagaraAreaSnapshotItem[];
  myReports: NagaraIssueSummary[];
  departmentIssues: NagaraIssueSummary[];
}

export interface NagaraSourceTag {
  label: string;
  kind: 'Official / Verified / Demo' | 'External / Live';
  url?: string;
}

export interface NagaraChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: NagaraSourceTag[];
  isError?: boolean;
  retryPayload?: string;
}

export interface PendingToolApproval {
  toolCallId: string;
  toolName: 'get_weather' | 'get_news';
  displayLabel: string;
  args: Record<string, string>;
  pendingState: unknown;
}

export interface NagaraToolRequest {
  id: string;
  name: 'get_weather' | 'get_news';
  args: Record<string, string>;
}

export interface NagaraChatResponse {
  reply: string;
  toolRequests?: NagaraToolRequest[];
  error?: string;
  status?: 'ok' | 'approval_required';
  sources?: NagaraSourceTag[];
  weatherUpdate?: { city: string; summary: string };
  pendingApproval?: PendingToolApproval;
}

