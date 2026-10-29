// Metric: docs/metric-catalogue.md#m17

import type { IsoDate } from '../brighthr/types';
import type { DashboardContext } from '../dashboard/context';
import type { ServiceBand, ServiceBandId } from '../dashboard/types';
import { addMonthsClamped, dayNumber } from '../dates';
import type { EmployeeRecord } from '../records/types';
import { isEmployedOn } from './headcountAt';
import { inGroup } from './membership';

const BANDS: readonly { band: ServiceBandId; label: string }[] = [
  { band: 'under1', label: 'Under 1 yr' },
  { band: 'y1', label: '1–2 yrs' },
  { band: 'y2', label: '2–3 yrs' },
  { band: 'y3', label: '3–4 yrs' },
  { band: 'y4', label: '4–5 yrs' },
  { band: 'y5plus', label: '5+ yrs' },
];

/** The date `years` after `startDate`; a 29 February start falls on 28 February when needed. */
export function anniversaryOf(startDate: IsoDate, years: number): IsoDate {
  return addMonthsClamped(startDate, 12 * years);
}

/** Whole years from `startDate` to `date`; a year is complete on its anniversary. */
export function completedYears(startDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(startDate.slice(0, 4));
  return anniversaryOf(startDate, years) <= date ? years : years - 1;
}

/** Current staff (D6 at today) in the filter group by their current department and role. */
export function currentStaff(ctx: DashboardContext): EmployeeRecord[] {
  return ctx.records.employees.filter(
    (e) => isEmployedOn(e, ctx.today) && inGroup(ctx.membership.at(e.employeeId, ctx.today), ctx.filter),
  );
}

export interface LengthOfService {
  /** Unrounded years; rounded when the response is built (D8). */
  averageYears: number;
  medianYears: number;
  firstYear: number;
  bands: ServiceBand[];
}

/** M17. Null when the group has no current staff. */
export function lengthOfService(ctx: DashboardContext): LengthOfService | null {
  const staff = currentStaff(ctx);
  if (staff.length === 0) return null;

  const years = staff.map((e) => (dayNumber(ctx.today) - dayNumber(e.startDate)) / 365.25).sort((a, b) => a - b);
  const mid = Math.floor(years.length / 2);
  const medianYears = years.length % 2 === 1 ? years[mid]! : (years[mid - 1]! + years[mid]!) / 2;

  const counts = BANDS.map(() => 0);
  for (const e of staff) counts[Math.min(completedYears(e.startDate, ctx.today), 5)]! += 1;

  return {
    averageYears: years.reduce((sum, y) => sum + y, 0) / years.length,
    medianYears,
    firstYear: counts[0]!,
    bands: BANDS.map((b, i) => ({ ...b, count: counts[i]! })),
  };
}
