// Which sickness reasons are kept (research R13, data-model §2.4). Reasons are special category
// health data, so the sync keeps only the ones "Who's off in Sales" can show, and drops each one
// at the first sync after it stops qualifying.

import type { IsoDate } from '../brighthr/types';
import { addDays } from '../dates';
import type { EmployeeRecord, Settings, SicknessReasonRecord } from '../records/types';
import { isSalesDepartment, type ReasonCandidate } from './buildRecords';

/**
 * Keeps a reason only for "a sickness absence of a current Sales-department employee that
 * overlaps today to today + 14 days, or is open-ended".
 */
export function selectSicknessReasons(
  employees: readonly EmployeeRecord[],
  candidates: readonly ReasonCandidate[],
  settings: Settings,
  today: IsoDate,
): SicknessReasonRecord[] {
  const horizon = addDays(today, 14);
  const byId = new Map(employees.map((e) => [e.employeeId, e]));
  return candidates
    .filter((c) => {
      const e = byId.get(c.employeeId);
      if (!e || (e.endDate !== null && e.endDate < today) || !isSalesDepartment(e.department, settings)) return false;
      return c.endDate === null || (c.endDate >= today && c.startDate <= horizon);
    })
    .map((c) => ({ absenceId: c.absenceId, reason: c.reason }));
}
