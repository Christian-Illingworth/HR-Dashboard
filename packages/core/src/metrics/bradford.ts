// Metric: docs/metric-catalogue.md#m05

import type { IsoDate } from '../brighthr/types';
import { sicknessEpisodes } from '../absences/episodes';
import type { CategorisedAbsence, DashboardContext } from '../dashboard/context';
import { addDays, maxDate } from '../dates';
import { isEmployedOn } from './headcountAt';
import { inGroup } from './membership';

export interface BradfordResult {
  /** Unrounded mean of S² × D; null when the group has no staff. */
  value: number | null;
  noStaff: boolean;
  basisStartDate: IsoDate;
  /** True when the dashboard holds less than 52 weeks: the KPI says "Based on data since …". */
  basisIsPartial: boolean;
}

/**
 * M05. The mean of each current employee's S² × D over the 364 days ending today (or since
 * historyStartDate, if later), including zeros. Pregnancy-related episodes are left out.
 */
export function bradfordAverage(ctx: DashboardContext): BradfordResult {
  const fullStart = addDays(ctx.today, -363);
  const history = ctx.status.historyStartDate;
  const basisStartDate = history ? maxDate(fullStart, history) : fullStart;
  const basisIsPartial = basisStartDate > fullStart;

  const people = ctx.records.employees.filter(
    (e) => isEmployedOn(e, ctx.today) && inGroup(ctx.membership.at(e.employeeId, ctx.today), ctx.filter),
  );
  if (people.length === 0) return { value: null, noStaff: true, basisStartDate, basisIsPartial };

  const ids = new Set(people.map((e) => e.employeeId));
  const sickness = ctx.absences.filter((a) => a.category === 'sickness' && ids.has(a.employeeId));
  const scores = new Map<string, { s: number; d: number }>();
  for (const episode of sicknessEpisodes(sickness, ctx.calendar)) {
    if (episode.pregnancyRelated) continue;
    const days = (episode.absences as CategorisedAbsence[])
      .flatMap((a) => a.spans)
      .filter((span) => span.date >= basisStartDate && span.date <= ctx.today)
      .reduce((sum, span) => sum + span.fraction, 0);
    if (days <= 0) continue;
    const score = scores.get(episode.employeeId) ?? { s: 0, d: 0 };
    score.s += 1;
    score.d += days;
    scores.set(episode.employeeId, score);
  }

  let total = 0;
  for (const { s, d } of scores.values()) total += s * s * d;
  return { value: total / people.length, noStaff: false, basisStartDate, basisIsPartial };
}
