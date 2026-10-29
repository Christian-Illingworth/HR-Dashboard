// Where synced records live (research R6, contracts/sharepoint-lists.md). Two implementations:
// FileStore (local development) and SharePointStore (the data site, via Graph).

import { createHash } from 'node:crypto';
import type {
  AbsenceRecord,
  DashboardRecords,
  EmployeeHistoryRow,
  EmployeeRecord,
  RawSettings,
  SicknessReasonRecord,
  SyncStatus,
} from '@hrd/core';

export interface KeyedChanges<T> {
  upsert: T[];
  /** Keys to delete. */
  delete: string[];
}

export interface Changes {
  employees?: KeyedChanges<EmployeeRecord>;
  history?: KeyedChanges<EmployeeHistoryRow>;
  absences?: KeyedChanges<AbsenceRecord>;
  /** Reasons are replaced wholesale: anything not in the list is deleted (research R13). */
  reasons?: { replace: SicknessReasonRecord[] };
}

export interface ChangeCounts {
  written: number;
  deleted: number;
  unchanged: number;
}

export interface Store {
  /** Fails with STORE_SCHEMA if a list or column is missing. Never creates or changes lists. */
  checkSchema(): Promise<void>;
  readAll(): Promise<DashboardRecords>;
  /** Items whose content hash hasn't changed are not rewritten. */
  applyChanges(changes: Changes): Promise<ChangeCounts>;
  getStatus(): Promise<{ status: SyncStatus; etag: string }>;
  /** Writes only if `etag` is still current; otherwise throws PreconditionFailed. */
  putStatus(status: SyncStatus, etag: string): Promise<string>;
  getSettings(): Promise<RawSettings>;
}

export class PreconditionFailed extends Error {
  constructor() {
    super('The item changed since it was read');
    this.name = 'PreconditionFailed';
  }
}

export class StoreError extends Error {
  constructor(readonly code: 'STORE_SCHEMA' | 'GRAPH_READ' | 'GRAPH_WRITE') {
    super(`Store error ${code}`);
    this.name = 'StoreError';
  }
}

export const keyOf = {
  employees: (e: EmployeeRecord) => e.employeeId,
  history: (h: EmployeeHistoryRow) => `${h.employeeId}|${h.month}`,
  absences: (a: AbsenceRecord) => a.absenceId,
  reasons: (r: SicknessReasonRecord) => r.absenceId,
};

/** A stable hash of a record's fields, used to skip unchanged writes. */
export function contentHash(record: object): string {
  const sorted = Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex').slice(0, 32);
}

export const initialStatus: SyncStatus = {
  lastAttemptStartedAt: null,
  lastAttemptFinishedAt: null,
  lastAttemptOutcome: null,
  lastFailureCode: null,
  lastSuccessAt: null,
  runningSince: null,
  lastManualRefreshAt: null,
  dataMode: 'Sample',
  historyStartDate: null,
  warnings: { departmentNotSet: 0, skippedRecords: 0 },
};

export const defaultSettings: RawSettings = { SalesDepartments: 'Sales', StandardDayHours: '7.5' };
