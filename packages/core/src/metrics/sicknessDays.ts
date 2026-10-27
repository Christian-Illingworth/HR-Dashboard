// Metric: docs/metric-catalogue.md#m07

import type { DashboardContext } from '../dashboard/context';
import type { Month } from '../records/types';
import { monthlyDays } from './monthlyDays';

/**
 * M07. Working days lost to sickness in a month, up to and including today (FR-012).
 * Pregnancy-related sickness is included; it is left out of the Bradford Factor only.
 */
export function sicknessDays(ctx: DashboardContext, month: Month): number {
  return monthlyDays(ctx, month, (a) => a.category === 'sickness', { upToToday: true });
}
