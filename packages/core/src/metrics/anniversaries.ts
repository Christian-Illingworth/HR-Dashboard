// Metric: docs/metric-catalogue.md#m18

import type { IsoDate } from '../brighthr/types';
import type { DashboardContext } from '../dashboard/context';
import type { AnniversaryEntry } from '../dashboard/types';
import { addMonthsClamped } from '../dates';
import { isEmployedOn } from './headcountAt';
import { anniversaryOf } from './lengthOfService';
import { inGroup } from './membership';

export interface Anniversaries {
  from: IsoDate;
  to: IsoDate;
  entries: AnniversaryEntry[];
}

const byName = (a: string | null, b: string | null) => (a ?? '').localeCompare(b ?? '', 'en-GB');

/** M18. Anniversaries from today to 3 months ahead, for staff in the filter group. */
export function anniversaries(ctx: DashboardContext): Anniversaries {
  const from = ctx.today;
  const to = addMonthsClamped(from, 3);
  const found: (AnniversaryEntry & { givenName: string | null; familyName: string | null })[] = [];

  for (const e of ctx.records.employees) {
    if (!inGroup(ctx.membership.at(e.employeeId, ctx.today), ctx.filter)) continue;
    const startYear = Number(e.startDate.slice(0, 4));
    for (let years = Math.max(1, Number(from.slice(0, 4)) - startYear); years <= Number(to.slice(0, 4)) - startYear; years++) {
      const date = anniversaryOf(e.startDate, years);
      if (date < from || date > to || !isEmployedOn(e, date)) continue;
      const name = [e.givenName, e.familyName].filter(Boolean).join(' ') || null;
      found.push({ name, role: e.jobTitle, date, years, milestone: years % 5 === 0, givenName: e.givenName, familyName: e.familyName });
    }
  }

  found.sort((a, b) => a.date.localeCompare(b.date) || byName(a.familyName, b.familyName) || byName(a.givenName, b.givenName));
  return { from, to, entries: found.map(({ givenName: _g, familyName: _f, ...entry }) => entry) };
}
