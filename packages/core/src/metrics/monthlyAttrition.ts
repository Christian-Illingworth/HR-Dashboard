// Metric: docs/metric-catalogue.md#m12

import type { DashboardContext } from '../dashboard/context';
import { firstDayOfMonth, lastDayOfMonth } from '../dates';
import type { Month } from '../records/types';
import { headcountOn } from './headcountAt';
import { leaverCounts } from './leavers';

export interface MonthlyRate {
  /** Unrounded; null for future months or a group with no staff. */
  percent: number | null;
  noStaff: boolean;
}

/**
 * M12. Leavers in the month ÷ ((headcount on the first day + on the last day) ÷ 2) × 100. In the
 * current month, today takes the place of the last day and only leavers to date count. Future
 * months have no rate: the chart shows known and forecast leavers instead.
 */
export function monthlyAttritionRate(ctx: DashboardContext, month: Month): MonthlyRate {
  if (month > ctx.currentMonth) return { percent: null, noStaff: false };
  const last = month === ctx.currentMonth ? ctx.today : lastDayOfMonth(month);
  const start = headcountOn(ctx.records.employees, firstDayOfMonth(month), ctx.filter, ctx.membership);
  const end = headcountOn(ctx.records.employees, last, ctx.filter, ctx.membership);
  const average = (start + end) / 2;
  if (average === 0) return { percent: null, noStaff: true };
  return { percent: (leaverCounts(ctx, month).actual / average) * 100, noStaff: false };
}
