// Metric: docs/metric-catalogue.md#m13

import type { DashboardContext } from '../dashboard/context';
import { addMonths } from '../dates';
import { sicknessDays } from '../metrics/sicknessDays';
import { sicknessEpisodeCount } from '../metrics/sicknessEpisodes';
import { coverageOf } from '../window/coverage';

export interface SicknessForecast {
  /** Unrounded; null with fewer than 3 full basis months. */
  days: number | null;
  episodes: number | null;
  basisMonths: number;
  notEnoughHistory: boolean;
}

/**
 * M13 and FR-016. The mean over the 12 months before the current month whose coverage is
 * `full`, the same for every future month. Fewer than 3 such months → no forecast.
 */
export function sicknessForecast(ctx: DashboardContext): SicknessForecast {
  const basis = Array.from({ length: 12 }, (_, i) => addMonths(ctx.currentMonth, -(i + 1))).filter(
    (m) => coverageOf(m, ctx.status.historyStartDate) === 'full',
  );
  if (basis.length < 3) return { days: null, episodes: null, basisMonths: basis.length, notEnoughHistory: true };
  const mean = (f: (m: string) => number) => basis.reduce((s, m) => s + f(m), 0) / basis.length;
  return {
    days: mean((m) => sicknessDays(ctx, m)),
    episodes: mean((m) => sicknessEpisodeCount(ctx, m)),
    basisMonths: basis.length,
    notEnoughHistory: false,
  };
}
