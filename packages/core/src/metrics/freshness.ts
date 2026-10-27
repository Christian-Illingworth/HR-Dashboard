// Metric: docs/metric-catalogue.md#m16

import { calendar as defaultCalendar, type WorkingDayCalendar } from '../calendar/workingDays';
import { londonParts, londonTimeToUtc } from '../calendar/london';
import type { Freshness } from '../dashboard/types';
import { addDays } from '../dates';
import type { SyncStatus } from '../records/types';

const HOUR = 3_600_000;
const FIFTEEN_MINUTES = 15 * 60_000;

export interface FreshnessInput {
  status: SyncStatus;
  /** ISO instant. */
  now: string;
  syncIntervalHours: 1 | 2;
  calendar?: WorkingDayCalendar;
}

/** The most recent 02:00 UK time run that is at least 30 minutes old. */
function referenceOvernightRun(now: string): number {
  const nowMs = Date.parse(now);
  const today = londonParts(now).date;
  const todays = Date.parse(londonTimeToUtc(today, 2, 0));
  return todays <= nowMs - 30 * 60_000 ? todays : Date.parse(londonTimeToUtc(addDays(today, -1), 2, 0));
}

/** M16. Whether the data shown is out of date (FR-023, FR-024). */
export function freshness({ status, now, syncIntervalHours, calendar = defaultCalendar }: FreshnessInput): Freshness {
  const base = {
    lastSuccessAt: status.lastSuccessAt,
    lastAttemptAt: status.lastAttemptStartedAt,
    lastAttemptOutcome: status.lastAttemptOutcome,
  };
  if (status.lastSuccessAt === null) return { ...base, noDataYet: true, isStale: false, staleReason: null };
  if (status.lastAttemptOutcome === 'Failed') return { ...base, noDataYet: false, isStale: true, staleReason: 'lastAttemptFailed' };

  const nowMs = Date.parse(now);
  const lastSuccess = Date.parse(status.lastSuccessAt);
  if (lastSuccess < referenceOvernightRun(now)) {
    return { ...base, noDataYet: false, isStale: true, staleReason: 'overnightMissed' };
  }

  const { date, hour } = londonParts(now);
  const inSyncHours = calendar.isWorkingDay(date) && hour >= 7 && hour <= 19;
  if (inSyncHours) {
    const dayStart = Date.parse(londonTimeToUtc(date, 7, 0));
    const threshold = (syncIntervalHours === 2 ? 3 : 2) * HOUR;
    if (nowMs - Math.max(lastSuccess, dayStart) > threshold) {
      return { ...base, noDataYet: false, isStale: true, staleReason: 'olderThanThreshold' };
    }
  }
  return { ...base, noDataYet: false, isStale: false, staleReason: null };
}

/** FR-025: 15 minutes after the last manual refresh, or now if that has passed. */
export function nextAllowedRefresh(lastManualRefreshAt: string | null, now: string): string {
  const nowMs = Date.parse(now);
  const next = lastManualRefreshAt === null ? nowMs : Date.parse(lastManualRefreshAt) + FIFTEEN_MINUTES;
  return new Date(Math.max(nowMs, next)).toISOString();
}
