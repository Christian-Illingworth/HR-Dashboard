// Metric: docs/metric-catalogue.md#m08

import { sicknessEpisodes, type SicknessEpisode } from '../absences/episodes';
import type { DashboardContext } from '../dashboard/context';
import type { Month } from '../records/types';
import { isEmployedOn } from './headcountAt';
import { inGroup } from './membership';

const cache = new WeakMap<DashboardContext, SicknessEpisode[]>();

/** All sickness episodes (D2) in the context, worked out once per request. */
export function episodesOf(ctx: DashboardContext): SicknessEpisode[] {
  let episodes = cache.get(ctx);
  if (!episodes) {
    episodes = sicknessEpisodes(
      ctx.absences.filter((a) => a.category === 'sickness'),
      ctx.calendar,
    );
    cache.set(ctx, episodes);
  }
  return episodes;
}

/**
 * M08. Sickness episodes starting in a month (and by today), for people in the group on the
 * episode's start date. An episode spanning two months counts once, in its start month.
 */
export function sicknessEpisodeCount(ctx: DashboardContext, month: Month): number {
  const employees = new Map(ctx.records.employees.map((e) => [e.employeeId, e]));
  return episodesOf(ctx).filter((ep) => {
    if (!ep.startDate.startsWith(month) || ep.startDate > ctx.today) return false;
    const e = employees.get(ep.employeeId);
    return !!e && isEmployedOn(e, ep.startDate) && inGroup(ctx.membership.at(e.employeeId, ep.startDate), ctx.filter);
  }).length;
}
