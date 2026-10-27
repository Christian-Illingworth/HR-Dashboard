// Metric: docs/metric-catalogue.md#m03

import type { DashboardContext } from '../dashboard/context';
import { absentToday } from './absentToday';

/**
 * M03. Distinct people in the group with sickness covering today. Open-ended sickness counts, and
 * so does pregnancy-related sickness (it is left out of the Bradford Factor only).
 */
export function offSickToday(ctx: DashboardContext): number {
  return absentToday(ctx, 'sickness');
}
