// Stored record types: what the sync keeps (specs/001-hr-dashboard/data-model.md §2,
// contracts/sharepoint-lists.md). Retention rules live in data-model.md §2.

import type { IsoDate } from '../brighthr/types';

export type Month = string; // YYYY-MM

export type BoundaryPart = 'FullDay' | 'FirstHalf' | 'SecondHalf' | 'Time';

export type AbsenceCategory =
  | 'annualLeave'
  | 'publicHoliday'
  | 'sickness'
  | 'compassionate'
  | 'unpaid'
  | 'other';

export const NOT_SET = 'Not set';

export interface EmployeeRecord {
  employeeId: string;
  /** Required. An employee with no start date is skipped and counted in the sync's warnings. */
  startDate: IsoDate;
  /** Last day of employment. */
  endDate: IsoDate | null;
  /** Blank → 'Not set'. */
  jobTitle: string;
  /** No match or blank → 'Not set'. */
  department: string;
  /** Set only while `department` is in `SalesDepartments`; cleared otherwise. */
  givenName: string | null;
  /** Set only while `department` is in `SalesDepartments`; cleared otherwise. */
  familyName: string | null;
}

export interface EmployeeHistoryRow {
  employeeId: string;
  /** Unique with `employeeId`. */
  month: Month;
  department: string;
  jobTitle: string;
}

export interface AbsenceRecord {
  absenceId: string;
  employeeId: string;
  /** Unknown values are stored as they are and categorised `other`. */
  brightHrType: string;
  displayName: string;
  startDate: IsoDate;
  /** `LocalDate` → `FullDay`. `LocalDateTime` → `Time`. */
  startPart: BoundaryPart;
  /** `endDate` ≥ `startDate` when set. Null = open-ended (sickness only). */
  endDate: IsoDate | null;
  endPart: BoundaryPart | null;
  /** Sickness only. */
  durationDays: number | null;
  /** Sickness only. */
  durationMinutes: number | null;
  /** Sickness only. Special category data. */
  pregnancyRelated: boolean;
}

export interface SicknessReasonRecord {
  absenceId: string;
  /** `reason.description`. Special category data. */
  reason: string;
}

export type SyncOutcome = 'Running' | 'Succeeded' | 'Failed';

export interface SyncWarnings {
  /** Current (not terminated) employees whose department is "Not set". */
  departmentNotSet: number;
  /** Records skipped because they failed validation. */
  skippedRecords: number;
  /** Last date covered by the bundled bank holidays. */
  bankHolidaysEndOn?: IsoDate;
}

export interface SyncStatus {
  lastAttemptStartedAt: string | null;
  lastAttemptFinishedAt: string | null;
  lastAttemptOutcome: SyncOutcome | null;
  /** A fixed code (research R7), never personal data. */
  lastFailureCode: string | null;
  /** Null = no sync has succeeded yet ("No data yet"). */
  lastSuccessAt: string | null;
  /** The sync lock. Stale after 30 minutes. */
  runningSince: string | null;
  lastManualRefreshAt: string | null;
  dataMode: 'Sample' | 'Live';
  /** First successful sync's date − 90 days. Never moves after it is set. */
  historyStartDate: IsoDate | null;
  warnings: SyncWarnings;
}

export interface AbsenceTypeMapping {
  displayName: string;
  category: AbsenceCategory;
}

export interface Settings {
  salesDepartments: string[];
  absenceTypeMap: AbsenceTypeMapping[];
  pregnancyRelatedReasons: string[];
  standardDayHours: number;
}

/** Everything the dashboard reads from storage. */
export interface DashboardRecords {
  employees: EmployeeRecord[];
  history: EmployeeHistoryRow[];
  absences: AbsenceRecord[];
  reasons: SicknessReasonRecord[];
}
