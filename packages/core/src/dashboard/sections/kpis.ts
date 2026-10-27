// The KPI row (US1, FR-007): M01–M05.

import { attrition12m } from '../../metrics/attrition12m';
import { bradfordAverage } from '../../metrics/bradford';
import { headcount } from '../../metrics/headcount';
import { offSickToday } from '../../metrics/offSickToday';
import { onLeaveToday } from '../../metrics/onLeaveToday';
import type { DashboardContext } from '../context';
import { round1 } from '../round';
import type { Kpis } from '../types';

export function buildKpis(ctx: DashboardContext): Kpis {
  const attrition = attrition12m(ctx);
  const bradford = bradfordAverage(ctx);
  return {
    headcount: headcount(ctx),
    onLeaveToday: onLeaveToday(ctx),
    offSickToday: offSickToday(ctx),
    attrition12m: {
      percent: round1(attrition.percent),
      leavers: attrition.leavers,
      averageHeadcount: round1(attrition.averageHeadcount),
      noStaff: attrition.noStaff,
    },
    bradfordAverage: { ...bradford, value: round1(bradford.value) },
  };
}
