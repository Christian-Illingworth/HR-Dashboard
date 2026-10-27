// Metric: docs/metric-catalogue.md#m10

import type { DashboardContext } from '../dashboard/context';
import type { Month } from '../records/types';
import { inGroup } from './membership';

export interface Counts {
  /** End (or start) on or before today. */
  actual: number;
  /** After today: a known leaver serving notice, or a known starter (FR-014). */
  known: number;
}

/** M10. Employees whose employment ends in the month, whatever the reason, in the group at their end date (D3). */
export function leaverCounts(ctx: DashboardContext, month: Month): Counts {
  const counts = { actual: 0, known: 0 };
  for (const e of ctx.records.employees) {
    if (e.endDate === null || !e.endDate.startsWith(month)) continue;
    if (!inGroup(ctx.membership.at(e.employeeId, e.endDate), ctx.filter)) continue;
    if (e.endDate <= ctx.today) counts.actual++;
    else counts.known++;
  }
  return counts;
}
