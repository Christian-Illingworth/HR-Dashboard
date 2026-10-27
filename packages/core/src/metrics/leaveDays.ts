// Metric: docs/metric-catalogue.md#m06

import type { DashboardContext } from '../dashboard/context';
import type { Month } from '../records/types';
import { monthlyDays } from './monthlyDays';

/**
 * M06. Working days of approved annual leave in a month (FR-011): taken for past months, taken
 * plus booked for the current month, booked for future months. Public holidays are left out.
 */
export function leaveDays(ctx: DashboardContext, month: Month): number {
  return monthlyDays(ctx, month, (a) => a.category === 'annualLeave');
}
