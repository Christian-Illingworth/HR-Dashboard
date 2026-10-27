// Metric: docs/metric-catalogue.md#m14

import type { DashboardContext } from '../dashboard/context';
import { addMonths, firstDayOfMonth } from '../dates';
import { headcountOn } from '../metrics/headcountAt';
import { leaverCounts } from '../metrics/leavers';
import type { Month } from '../records/types';

export interface LeaverForecast {
  /** Unrounded mean of monthly leavers; null with fewer than 3 basis months. */
  average: number | null;
  basisMonths: number;
  notEnoughHistory: boolean;
}

/**
 * M14 and FR-016. Basis months are the 12 months before the current month in which the group's
 * headcount at the start of the month was more than 0. Uses employment dates, so it is not
 * limited by the 90-day absence history.
 */
export function leaverForecast(ctx: DashboardContext): LeaverForecast {
  const basis = Array.from({ length: 12 }, (_, i) => addMonths(ctx.currentMonth, -(i + 1))).filter(
    (m) => headcountOn(ctx.records.employees, firstDayOfMonth(m), ctx.filter, ctx.membership) > 0,
  );
  if (basis.length < 3) return { average: null, basisMonths: basis.length, notEnoughHistory: true };
  const total = basis.reduce((s, m) => s + leaverCounts(ctx, m).actual, 0);
  return { average: total / basis.length, basisMonths: basis.length, notEnoughHistory: false };
}

/** Further leavers for a future month: the average minus that month's known leavers, never below 0. */
export function furtherLeavers(ctx: DashboardContext, month: Month): number | null {
  const { average } = leaverForecast(ctx);
  if (average === null) return null;
  return Math.max(0, average - leaverCounts(ctx, month).known);
}
