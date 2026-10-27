// Metric: docs/metric-catalogue.md#d6

import type { IsoDate } from '../brighthr/types';
import type { EmployeeRecord } from '../records/types';
import { inGroup, type GroupFilter, type Membership } from './membership';

/** Employed on `date`: started on or before it, and not left before it (end date is the last day). */
export function isEmployedOn(e: EmployeeRecord, date: IsoDate): boolean {
  return e.startDate <= date && (e.endDate === null || e.endDate >= date);
}

/** D6. People (not FTE) employed on `date` and in the filter group as at that date. */
export function headcountOn(
  employees: readonly EmployeeRecord[],
  date: IsoDate,
  filter: GroupFilter,
  membership: Membership,
): number {
  return employees.filter((e) => isEmployedOn(e, date) && inGroup(membership.at(e.employeeId, date), filter)).length;
}
