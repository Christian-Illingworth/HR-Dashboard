// Metric: docs/metric-catalogue.md#m11

import type { DashboardContext } from '../dashboard/context';
import type { Month } from '../records/types';
import type { Counts } from './leavers';
import { inGroup } from './membership';

/** M11. Employees whose employment starts in the month, in the group at their start date (D3). */
export function starterCounts(ctx: DashboardContext, month: Month): Counts {
  const counts = { actual: 0, known: 0 };
  for (const e of ctx.records.employees) {
    if (!e.startDate.startsWith(month)) continue;
    if (!inGroup(ctx.membership.at(e.employeeId, e.startDate), ctx.filter)) continue;
    if (e.startDate <= ctx.today) counts.actual++;
    else counts.known++;
  }
  return counts;
}
