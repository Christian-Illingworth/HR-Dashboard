// Shared by M02 and M03: distinct people in the group whose absence of a category covers today.

import type { DashboardContext } from '../dashboard/context';
import type { AbsenceCategory } from '../records/types';
import { isEmployedOn } from './headcountAt';
import { inGroup } from './membership';

export function absentToday(ctx: DashboardContext, category: AbsenceCategory): number {
  const inGroupToday = new Set(
    ctx.records.employees
      .filter((e) => isEmployedOn(e, ctx.today) && inGroup(ctx.membership.at(e.employeeId, ctx.today), ctx.filter))
      .map((e) => e.employeeId),
  );
  const people = new Set<string>();
  for (const a of ctx.absences) {
    if (a.category !== category || !inGroupToday.has(a.employeeId)) continue;
    if (a.spans.some((s) => s.date === ctx.today && s.fraction > 0)) people.add(a.employeeId);
  }
  return people.size;
}
