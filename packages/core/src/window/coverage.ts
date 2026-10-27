// Metric: docs/metric-catalogue.md#d4

import type { IsoDate } from '../brighthr/types';
import type { Coverage } from '../dashboard/types';
import { firstDayOfMonth, monthOf } from '../dates';
import type { Month } from '../records/types';

/**
 * D4. How much absence data the dashboard holds for a month: `full` if the month starts on or
 * after `historyStartDate`, `partial` if it contains it, and `none` if it ends before it (or
 * no sync has succeeded yet).
 */
export function coverageOf(month: Month, historyStartDate: IsoDate | null): Coverage {
  if (historyStartDate === null) return 'none';
  if (firstDayOfMonth(month) >= historyStartDate) return 'full';
  return month === monthOf(historyStartDate) ? 'partial' : 'none';
}
