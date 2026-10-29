// Retention (spec Assumptions: 13 months; data-model §2; research R11). Returns keys to delete.

import type { IsoDate } from '../brighthr/types';
import { addMonths, addMonthsClamped, monthOf } from '../dates';
import type { DashboardRecords } from '../records/types';

export interface RetentionDeletes {
  employees: string[];
  /** History keys, `employeeId|month`. */
  history: string[];
  absences: string[];
}

export function retentionDeletes(records: DashboardRecords, today: IsoDate): RetentionDeletes {
  const cutoff = addMonthsClamped(today, -13);
  const oldestMonth = addMonths(monthOf(today), -13);
  const goneEmployees = new Set(
    records.employees.filter((e) => e.endDate !== null && e.endDate < cutoff).map((e) => e.employeeId),
  );
  const history = new Set(
    records.history
      .filter((h) => goneEmployees.has(h.employeeId) || h.month < oldestMonth)
      .map((h) => `${h.employeeId}|${h.month}`),
  );
  return {
    employees: [...goneEmployees],
    history: [...history],
    absences: records.absences.filter((a) => a.endDate !== null && a.endDate < cutoff).map((a) => a.absenceId),
  };
}
