// Test helpers: a DashboardContext from the fixtures (with a filter), or from inline records.
import { createContext, type DashboardContext } from '../src/dashboard/context';
import type { AbsenceRecord, DashboardRecords, EmployeeRecord, SicknessReasonRecord, SyncStatus } from '../src/records/types';
import { sampleInput, TODAY, NOW } from './sampleInput';
import launchStatus from '../../../fixtures/launch-sync-status.json';

export interface Filter {
  department?: string;
  role?: string;
}

/** Context over the synthetic fixtures. `launch` uses historyStartDate 2026-07-29. */
export function fixtureContext(
  filter: Filter = {},
  opts: { launch?: boolean; month?: string; reasons?: SicknessReasonRecord[]; rawSettings?: Record<string, string> } = {},
): DashboardContext {
  const input = sampleInput(opts.rawSettings ? { rawSettings: opts.rawSettings } : {});
  return createContext({
    records: opts.reasons ? { ...input.records, reasons: opts.reasons } : input.records,
    settings: input.settings,
    status: opts.launch ? (launchStatus as SyncStatus) : input.status,
    today: TODAY,
    now: NOW,
    selectedMonth: opts.month ?? '2026-10',
    filter: { department: filter.department ?? 'All', role: filter.role ?? 'All' },
    syncIntervalHours: 1,
  });
}

export const baseStatus: SyncStatus = {
  lastAttemptStartedAt: '2026-10-27T08:58:00Z',
  lastAttemptFinishedAt: '2026-10-27T09:00:00Z',
  lastAttemptOutcome: 'Succeeded',
  lastFailureCode: null,
  lastSuccessAt: '2026-10-27T09:00:00Z',
  runningSince: null,
  lastManualRefreshAt: null,
  dataMode: 'Sample',
  historyStartDate: '2025-10-01',
  warnings: { departmentNotSet: 0, skippedRecords: 0 },
};

/** Context over inline records, for single edge cases. */
export function inlineContext(
  records: Partial<DashboardRecords>,
  opts: { today?: string; filter?: Filter; status?: Partial<SyncStatus>; month?: string } = {},
): DashboardContext {
  const today = opts.today ?? TODAY;
  return createContext({
    records: { employees: [], absences: [], history: [], reasons: [], ...records },
    settings: { salesDepartments: ['Sales'], absenceTypeMap: [{ displayName: 'Bank holiday', category: 'publicHoliday' }], pregnancyRelatedReasons: [], standardDayHours: 7.5 },
    status: { ...baseStatus, ...opts.status },
    today,
    now: `${today}T10:30:00.000Z`,
    selectedMonth: opts.month ?? today.slice(0, 7),
    filter: { department: opts.filter?.department ?? 'All', role: opts.filter?.role ?? 'All' },
    syncIntervalHours: 1,
  });
}

let seq = 0;
export function employee(over: Partial<EmployeeRecord> = {}): EmployeeRecord {
  seq += 1;
  return {
    employeeId: `emp${seq}`,
    startDate: '2020-01-06',
    endDate: null,
    jobTitle: 'Energy Analyst',
    department: 'Analysis',
    givenName: null,
    familyName: null,
    ...over,
  };
}

export function absence(employeeId: string, over: Partial<AbsenceRecord> = {}): AbsenceRecord {
  seq += 1;
  return {
    absenceId: `abs${seq}`,
    employeeId,
    brightHrType: 'Holiday',
    displayName: 'Annual leave',
    startDate: '2026-10-27',
    startPart: 'FullDay',
    endDate: '2026-10-27',
    endPart: 'FullDay',
    durationDays: null,
    durationMinutes: null,
    pregnancyRelated: false,
    ...over,
  };
}
