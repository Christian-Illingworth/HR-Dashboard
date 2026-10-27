// Metric: docs/metric-catalogue.md#m02

import type { DashboardContext } from '../dashboard/context';
import { absentToday } from './absentToday';

/** M02. Distinct people in the group with approved annual leave covering today, half days included. */
export function onLeaveToday(ctx: DashboardContext): number {
  return absentToday(ctx, 'annualLeave');
}
