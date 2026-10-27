// Metric: docs/metric-catalogue.md#m09

import type { DashboardContext } from '../dashboard/context';
import type { Month } from '../records/types';
import { monthlyDays } from './monthlyDays';
import { sicknessDays } from './sicknessDays';

export interface AbsenceByType {
  sickness: number;
  compassionate: number;
  unpaid: number;
  other: number;
}

/**
 * M09. Working days per month by type (FR-013). Annual leave and public holidays are left out.
 * Sickness counts up to today; the other types include days booked ahead.
 */
export function absenceDaysByType(ctx: DashboardContext, month: Month): AbsenceByType {
  return {
    sickness: sicknessDays(ctx, month),
    compassionate: monthlyDays(ctx, month, (a) => a.category === 'compassionate'),
    unpaid: monthlyDays(ctx, month, (a) => a.category === 'unpaid'),
    other: monthlyDays(ctx, month, (a) => a.category === 'other'),
  };
}
