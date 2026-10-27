// Shared by M06, M07 and M09: working-day fractions in a month, for absences matching a test,
// counting each day only if the person was employed and in the filter group on that day (D3).

import type { CategorisedAbsence, DashboardContext } from '../dashboard/context';
import type { Month } from '../records/types';
import { isEmployedOn } from './headcountAt';
import { inGroup } from './membership';

export function monthlyDays(
  ctx: DashboardContext,
  month: Month,
  include: (a: CategorisedAbsence) => boolean,
  opts: { upToToday?: boolean } = {},
): number {
  const employees = new Map(ctx.records.employees.map((e) => [e.employeeId, e]));
  let total = 0;
  for (const a of ctx.absences) {
    if (!include(a)) continue;
    const e = employees.get(a.employeeId);
    if (!e) continue;
    for (const span of a.spans) {
      if (!span.date.startsWith(month)) continue;
      if (opts.upToToday && span.date > ctx.today) continue;
      if (!isEmployedOn(e, span.date) || !inGroup(ctx.membership.at(e.employeeId, span.date), ctx.filter)) continue;
      total += span.fraction;
    }
  }
  return total;
}
