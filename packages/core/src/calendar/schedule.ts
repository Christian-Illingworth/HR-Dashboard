// The sync schedule (FR-024, research R7). The timer fires hourly in UTC; this decides, in UK
// time, whether this hour is a sync hour. That handles BST without a time-zone setting.

import { londonParts } from './london';
import { calendar as defaultCalendar, type WorkingDayCalendar } from './workingDays';

/**
 * Working days at 07:00–19:00 UK time: every hour, or 07, 09 … 19 on the 2-hourly fallback.
 * Plus 02:00 every day (the overnight run).
 */
export function shouldSync(nowUtc: string, intervalHours: 1 | 2, cal: WorkingDayCalendar = defaultCalendar): boolean {
  const { date, hour } = londonParts(nowUtc);
  if (hour === 2) return true;
  if (!cal.isWorkingDay(date) || hour < 7 || hour > 19) return false;
  return intervalHours === 1 || (hour - 7) % 2 === 0;
}
