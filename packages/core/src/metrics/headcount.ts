// Metric: docs/metric-catalogue.md#m01

import type { DashboardContext } from '../dashboard/context';
import { headcountOn } from './headcountAt';

/** M01. People employed today in the filter group (D6 with d = today). */
export function headcount(ctx: DashboardContext): number {
  return headcountOn(ctx.records.employees, ctx.today, ctx.filter, ctx.membership);
}
