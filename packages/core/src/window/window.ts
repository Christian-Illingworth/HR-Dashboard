// Metric: docs/metric-catalogue.md#d4

import { addMonths } from '../dates';
import type { Period } from '../dashboard/types';
import type { Month } from '../records/types';

export interface WindowMonth {
  month: Month;
  period: Period;
  isSelected: boolean;
  isCurrent: boolean;
}

/** D4. The selected month `s` and months s−3 … s+3, each marked actual, toDate or future. */
export function monthWindow(selected: Month, current: Month): WindowMonth[] {
  return [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
    const month = addMonths(selected, offset);
    const period: Period = month < current ? 'actual' : month === current ? 'toDate' : 'future';
    return { month, period, isSelected: offset === 0, isCurrent: month === current };
  });
}
