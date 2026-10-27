// The API response, mirroring specs/001-hr-dashboard/contracts/dashboard-api.openapi.yaml.
// Metric IDs refer to docs/metric-catalogue.md.

import type { IsoDate } from '../brighthr/types';
import type { BoundaryPart, Month, SyncOutcome } from '../records/types';

export type ValueKind = 'actual' | 'toDate' | 'booked' | 'known' | 'forecast';
export type SectionStatus = 'ok' | 'empty' | 'error';
export type StaleReason = 'lastAttemptFailed' | 'olderThanThreshold' | 'overnightMissed';
export type Coverage = 'full' | 'partial' | 'none';
export type Period = 'actual' | 'toDate' | 'future';

/** One plotted value. `kind` drives styling and the tooltip label (FR-015, FR-017). */
export interface Value {
  value: number | null;
  kind: ValueKind;
}

export interface Section<T> {
  status: SectionStatus;
  message?: string;
  data?: T;
}

export interface MonthBase {
  month: Month;
  period: Period;
  isSelected: boolean;
  isCurrent: boolean;
  /** D4. Always "full" for the attrition chart. */
  coverage: Coverage;
}

export interface Kpis {
  headcount: number;
  onLeaveToday: number;
  offSickToday: number;
  attrition12m: { percent: number | null; leavers: number; averageHeadcount: number; noStaff: boolean };
  bradfordAverage: {
    value: number | null;
    noStaff: boolean;
    basisStartDate: IsoDate;
    basisIsPartial: boolean;
  };
}

export interface LeaveMonth extends MonthBase {
  approvedDays: Value;
  pendingDays: Value;
}
export interface LeaveData {
  pendingAvailable: boolean;
  months: LeaveMonth[];
}

export interface SicknessMonth extends MonthBase {
  days: Value;
  episodes: Value;
}
export interface SicknessData {
  forecastBasisMonths: number;
  notEnoughHistory: boolean;
  months: SicknessMonth[];
}

export interface AbsenceMonth extends MonthBase {
  sickness: Value;
  compassionate: Value;
  unpaid: Value;
  other: Value;
}
export interface AbsenceData {
  months: AbsenceMonth[];
}

export interface AttritionMonth extends MonthBase {
  leaversActual: Value;
  leaversKnown: Value;
  leaversForecast: Value;
  startersActual: Value;
  startersKnown: Value;
  ratePercent: Value;
  noStaff: boolean;
}
export interface AttritionData {
  forecastBasisMonths: number;
  notEnoughHistory: boolean;
  months: AttritionMonth[];
}

export interface SalesBoundary {
  date: IsoDate;
  part: BoundaryPart;
}
export interface SalesEntry {
  name: string;
  role: string;
  absenceType: string;
  /** Special category data. Only present in this section (FR-006). */
  sicknessReason: string | null;
  start: SalesBoundary;
  /** null → "Not yet known". */
  end: SalesBoundary | null;
  /** null → "Not yet known". */
  returnDate: IsoDate | null;
  status: 'Approved' | 'Pending';
}
export interface SalesData {
  outsideFilter: boolean;
  departmentsNotFound: string[];
  pendingAvailable: boolean;
  today: SalesEntry[];
  upcoming: SalesEntry[];
}

export interface Freshness {
  noDataYet: boolean;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastAttemptOutcome: SyncOutcome | null;
  isStale: boolean;
  staleReason: StaleReason | null;
}

export interface DashboardQuery {
  month?: Month;
  department?: string;
  role?: string;
}

export interface DashboardResponse {
  meta: { dataMode: 'sample' | 'live'; today: IsoDate; generatedAt: string };
  freshness: Freshness;
  refresh: { nextAllowedAt: string };
  filters: {
    applied: { month: Month; department: string; role: string };
    options: { months: Month[]; departments: string[]; roles: string[] };
  };
  coverage: { historyStartDate: IsoDate | null; departmentHistoryStartMonth: Month | null };
  sections: {
    kpis: Section<Kpis>;
    leave: Section<LeaveData>;
    sickness: Section<SicknessData>;
    absence: Section<AbsenceData>;
    attrition: Section<AttritionData>;
    salesAbsences: Section<SalesData>;
  };
}

export const ALL = 'All';
