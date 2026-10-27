// The attrition chart (US6, FR-014): leavers (actual, known, forecast kept apart), starters
// (actual, known) and the monthly rate. Values that don't apply to a month are null.

import { furtherLeavers, leaverForecast } from '../../forecast/leavers';
import { leaverCounts } from '../../metrics/leavers';
import { monthlyAttritionRate } from '../../metrics/monthlyAttrition';
import { starterCounts } from '../../metrics/starters';
import type { DashboardContext } from '../context';
import { round1 } from '../round';
import type { AttritionData, Value, ValueKind } from '../types';

const v = (value: number | null, kind: ValueKind): Value => ({ value: round1(value), kind });

export function buildAttrition(ctx: DashboardContext): AttritionData {
  const forecast = leaverForecast(ctx);
  return {
    forecastBasisMonths: forecast.basisMonths,
    notEnoughHistory: forecast.notEnoughHistory,
    months: ctx.window.map((wm) => {
      const leavers = leaverCounts(ctx, wm.month);
      const starters = starterCounts(ctx, wm.month);
      const base = { ...wm, coverage: 'full' as const };
      if (wm.period === 'future') {
        return {
          ...base,
          leaversActual: v(null, 'actual'),
          leaversKnown: v(leavers.known, 'known'),
          leaversForecast: v(furtherLeavers(ctx, wm.month), 'forecast'),
          startersActual: v(null, 'actual'),
          startersKnown: v(starters.known, 'known'),
          ratePercent: v(null, 'actual'),
          noStaff: false,
        };
      }
      const kind: ValueKind = wm.period === 'toDate' ? 'toDate' : 'actual';
      const current = wm.period === 'toDate';
      const rate = monthlyAttritionRate(ctx, wm.month);
      return {
        ...base,
        leaversActual: v(leavers.actual, kind),
        leaversKnown: v(current ? leavers.known : null, 'known'),
        leaversForecast: v(null, 'forecast'),
        startersActual: v(starters.actual, kind),
        startersKnown: v(current ? starters.known : null, 'known'),
        ratePercent: v(rate.percent, kind),
        noStaff: rate.noStaff,
      };
    }),
  };
}
