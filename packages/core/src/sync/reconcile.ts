// Research R11: within the window just fetched for an employee, BrightHR's answer is the truth.

import type { IsoDate } from '../brighthr/types';
import type { AbsenceRecord } from '../records/types';

export interface FetchWindow {
  from: IsoDate;
  to: IsoDate;
}

const overlaps = (a: AbsenceRecord, w: FetchWindow) => a.startDate <= w.to && (a.endDate === null || a.endDate >= w.from);

/**
 * Stored absences for a fetched employee that overlap the window but weren't returned are
 * deleted (cancelled or rejected). Absences that end before the window are frozen, because they
 * can no longer be fetched. Employees not fetched are untouched. Everything returned is upserted.
 */
export function reconcileAbsences(
  stored: readonly AbsenceRecord[],
  fetched: readonly AbsenceRecord[],
  fetchedEmployeeIds: readonly string[],
  window: FetchWindow,
): { upsert: AbsenceRecord[]; delete: string[] } {
  const employees = new Set(fetchedEmployeeIds);
  const returned = new Set(fetched.map((a) => a.absenceId));
  return {
    upsert: [...fetched],
    delete: stored
      .filter((a) => employees.has(a.employeeId) && overlaps(a, window) && !returned.has(a.absenceId))
      .map((a) => a.absenceId),
  };
}
