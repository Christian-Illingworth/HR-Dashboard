// Metric: docs/metric-catalogue.md#m04

import type { IsoDate } from '../brighthr/types';
import type { DashboardContext } from '../dashboard/context';
import { addMonthsClamped } from '../dates';
import { headcountOn } from './headcountAt';
import { inGroup } from './membership';

export interface Attrition12m {
  /** Unrounded; null when the group has no staff. */
  percent: number | null;
  leavers: number;
  averageHeadcount: number;
  noStaff: boolean;
}

/** The 13 headcount dates: today − k months for k = 0…12, clamped to the month's last day. */
export function attritionDates(today: IsoDate): IsoDate[] {
  return Array.from({ length: 13 }, (_, k) => addMonthsClamped(today, -k));
}

/**
 * M04. Leavers in P = (today − 12 months, today] ÷ the mean of the 13 headcounts × 100 (FR-008).
 * All leavers count, whatever the reason. Each leaver's group is taken at their end date (D3).
 */
export function attrition12m(ctx: DashboardContext): Attrition12m {
  const periodStartExclusive = addMonthsClamped(ctx.today, -12);
  const headcounts = attritionDates(ctx.today).map((d) =>
    headcountOn(ctx.records.employees, d, ctx.filter, ctx.membership),
  );
  const averageHeadcount = headcounts.reduce((s, h) => s + h, 0) / headcounts.length;
  const leavers = ctx.records.employees.filter(
    (e) =>
      e.endDate !== null &&
      e.endDate > periodStartExclusive &&
      e.endDate <= ctx.today &&
      inGroup(ctx.membership.at(e.employeeId, e.endDate), ctx.filter),
  ).length;

  if (averageHeadcount === 0) return { percent: null, leavers, averageHeadcount: 0, noStaff: true };
  return { percent: (leavers / averageHeadcount) * 100, leavers, averageHeadcount, noStaff: false };
}
