// Builds the API response (contracts/dashboard-api.openapi.yaml) from stored records.
// Pure: the Function's /api/dashboard and the web part's mock-data mode both call it.

import type { IsoDate } from '../brighthr/types';
import type { WorkingDayCalendar } from '../calendar/workingDays';
import { monthOf } from '../dates';
import type { DashboardRecords, Settings, SyncStatus } from '../records/types';
import { pickableMonths } from '../window/picker';
import { createContext, type DashboardContext } from './context';
import { ALL, type DashboardQuery, type DashboardResponse, type Section } from './types';

export interface BuildDashboardInput {
  records: DashboardRecords;
  status: SyncStatus;
  settings: Settings;
  query: DashboardQuery;
  /** Europe/London date. */
  today: IsoDate;
  /** ISO instant. */
  now: string;
  /** FR-024: 1 normally, 2 on the rate-limit fallback. */
  syncIntervalHours: 1 | 2;
  calendar?: WorkingDayCalendar;
}

export class BadRequestError extends Error {
  readonly code = 'badRequest';
  constructor(field: string) {
    super(`The ${field} asked for is not offered.`);
    this.name = 'BadRequestError';
  }
}

/** FR-026: one section failing gives that section an error state and leaves the rest alone. */
export function safeSection<T>(build: () => T): Section<T> {
  try {
    return { status: 'ok', data: build() };
  } catch {
    // The error text is not passed on: it could describe the data (constitution, Security).
    return { status: 'error', message: 'This section could not be calculated.' };
  }
}

const byName = (a: string, b: string) => a.localeCompare(b, 'en-GB');

export function filterOptions(input: BuildDashboardInput) {
  const current = input.records.employees.filter((e) => e.endDate === null || e.endDate >= input.today);
  return {
    months: pickableMonths(monthOf(input.today), input.status.historyStartDate),
    departments: [ALL, ...[...new Set(current.map((e) => e.department))].sort(byName)],
    roles: [ALL, ...[...new Set(current.map((e) => e.jobTitle))].sort(byName)],
  };
}

type SectionBuilders = {
  [K in keyof DashboardResponse['sections']]: (ctx: DashboardContext) => DashboardResponse['sections'][K];
};

// Each user story replaces its placeholder here.
const sections: SectionBuilders = {
  kpis: () => ({ status: 'empty' }),
  leave: () => ({ status: 'empty' }),
  sickness: () => ({ status: 'empty' }),
  absence: () => ({ status: 'empty' }),
  attrition: () => ({ status: 'empty' }),
  salesAbsences: () => ({ status: 'empty' }),
};

export function buildDashboard(input: BuildDashboardInput): DashboardResponse {
  const options = filterOptions(input);
  const applied = {
    month: input.query.month ?? monthOf(input.today),
    department: input.query.department ?? ALL,
    role: input.query.role ?? ALL,
  };
  if (!options.months.includes(applied.month)) throw new BadRequestError('month');
  if (!options.departments.includes(applied.department)) throw new BadRequestError('department');
  if (!options.roles.includes(applied.role)) throw new BadRequestError('role');

  const ctx = createContext({
    records: input.records,
    settings: input.settings,
    status: input.status,
    today: input.today,
    now: input.now,
    selectedMonth: applied.month,
    filter: { department: applied.department, role: applied.role },
    syncIntervalHours: input.syncIntervalHours,
    calendar: input.calendar,
  });

  return {
    meta: {
      dataMode: input.status.dataMode === 'Live' ? 'live' : 'sample',
      today: input.today,
      generatedAt: new Date(input.now).toISOString(),
    },
    freshness: {
      noDataYet: input.status.lastSuccessAt === null,
      lastSuccessAt: input.status.lastSuccessAt,
      lastAttemptAt: input.status.lastAttemptStartedAt,
      lastAttemptOutcome: input.status.lastAttemptOutcome,
      isStale: false,
      staleReason: null,
    },
    refresh: { nextAllowedAt: new Date(input.now).toISOString() },
    filters: { applied, options },
    coverage: {
      historyStartDate: input.status.historyStartDate,
      departmentHistoryStartMonth: ctx.membership.departmentHistoryStartMonth,
    },
    sections: {
      kpis: sections.kpis(ctx),
      leave: sections.leave(ctx),
      sickness: sections.sickness(ctx),
      absence: sections.absence(ctx),
      attrition: sections.attrition(ctx),
      salesAbsences: sections.salesAbsences(ctx),
    },
  };
}
