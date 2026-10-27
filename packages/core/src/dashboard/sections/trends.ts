// The leave, sickness and absence charts (US5). Each month carries its period, the selected
// and current flags, coverage (D4), and a kind on every value (FR-015, FR-017).

import { sicknessForecast } from '../../forecast/sickness';
import { absenceDaysByType } from '../../metrics/absenceByType';
import { leaveDays } from '../../metrics/leaveDays';
import { sicknessDays } from '../../metrics/sicknessDays';
import { sicknessEpisodeCount } from '../../metrics/sicknessEpisodes';
import { coverageOf } from '../../window/coverage';
import type { WindowMonth } from '../../window/window';
import type { DashboardContext } from '../context';
import { round1 } from '../round';
import type { AbsenceData, LeaveData, MonthBase, SicknessData, Value, ValueKind } from '../types';

export function monthBase(ctx: DashboardContext, wm: WindowMonth): MonthBase {
  return { ...wm, coverage: coverageOf(wm.month, ctx.status.historyStartDate) };
}

/** Kind for actual-or-booked data: taken in the past, booked in the future. */
function bookedKind(wm: WindowMonth): ValueKind {
  return wm.period === 'actual' ? 'actual' : wm.period === 'toDate' ? 'toDate' : 'booked';
}
/** Kind for sickness: actual in the past, forecast in the future. */
function sicknessKind(wm: WindowMonth): ValueKind {
  return wm.period === 'future' ? 'forecast' : bookedKind(wm);
}
const value = (v: number | null, kind: ValueKind): Value => ({ value: round1(v), kind });

export function buildLeave(ctx: DashboardContext): LeaveData {
  return {
    pendingAvailable: false,
    months: ctx.window.map((wm) => ({
      ...monthBase(ctx, wm),
      approvedDays: value(leaveDays(ctx, wm.month), bookedKind(wm)),
      pendingDays: { value: null, kind: bookedKind(wm) },
    })),
  };
}

export function buildSickness(ctx: DashboardContext): SicknessData {
  const forecast = sicknessForecast(ctx);
  return {
    forecastBasisMonths: forecast.basisMonths,
    notEnoughHistory: forecast.notEnoughHistory,
    months: ctx.window.map((wm) => {
      const kind = sicknessKind(wm);
      const future = wm.period === 'future';
      return {
        ...monthBase(ctx, wm),
        days: value(future ? forecast.days : sicknessDays(ctx, wm.month), kind),
        episodes: value(future ? forecast.episodes : sicknessEpisodeCount(ctx, wm.month), kind),
      };
    }),
  };
}

export function buildAbsence(ctx: DashboardContext): AbsenceData {
  const forecast = sicknessForecast(ctx);
  return {
    months: ctx.window.map((wm) => {
      const byType = absenceDaysByType(ctx, wm.month);
      const future = wm.period === 'future';
      return {
        ...monthBase(ctx, wm),
        sickness: value(future ? forecast.days : byType.sickness, sicknessKind(wm)),
        compassionate: value(byType.compassionate, bookedKind(wm)),
        unpaid: value(byType.unpaid, bookedKind(wm)),
        other: value(byType.other, bookedKind(wm)),
      };
    }),
  };
}
