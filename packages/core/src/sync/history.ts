// Department and role history (research R11, D3): one row per employee per month, upserted
// during the month and frozen once it ends.

import type { IsoDate } from '../brighthr/types';
import { addDays, firstDayOfMonth, lastDayOfMonth, monthOf } from '../dates';
import type { EmployeeHistoryRow, EmployeeRecord } from '../records/types';

/** Rows for the current month, for everyone employed at any point in it. */
export function currentHistoryRows(employees: readonly EmployeeRecord[], today: IsoDate): EmployeeHistoryRow[] {
  const month = monthOf(today);
  const first = firstDayOfMonth(month);
  const last = lastDayOfMonth(month);
  return employees
    .filter((e) => e.startDate <= last && (e.endDate === null || e.endDate >= first))
    .map((e) => ({ employeeId: e.employeeId, month, department: e.department, jobTitle: e.jobTitle }));
}

/** "First successful sync's date − 90 days" and "Never moves after it is set". */
export function nextHistoryStartDate(existing: IsoDate | null, today: IsoDate): IsoDate {
  return existing ?? addDays(today, -90);
}
