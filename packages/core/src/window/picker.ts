// Metric: docs/metric-catalogue.md#d4

import type { IsoDate } from '../brighthr/types';
import { addMonths, monthOf } from '../dates';
import type { Month } from '../records/types';

/**
 * D4 and FR-021. Months the user may pick, newest first: current − 9 to current, where s − 3
 * is on or after the month of `historyStartDate`. The current month is always offered.
 */
export function pickableMonths(current: Month, historyStartDate: IsoDate | null): Month[] {
  const historyMonth = historyStartDate === null ? null : monthOf(historyStartDate);
  const out: Month[] = [];
  for (let back = 0; back <= 9; back++) {
    const s = addMonths(current, -back);
    if (back === 0 || (historyMonth !== null && addMonths(s, -3) >= historyMonth)) out.push(s);
  }
  return out;
}
