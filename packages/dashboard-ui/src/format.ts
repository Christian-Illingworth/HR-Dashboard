// Display formatting. Dates and times always read in UK time (Europe/London).

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Europe/London',
});
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/London' });
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthShortFormat = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' });
const monthLongFormat = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const atUtcMidnight = (date: string) => new Date(`${date}T00:00:00Z`);

/** 2026-07-29 → "29 Jul 2026". */
export const formatDate = (date: string) => dateFormat.format(atUtcMidnight(date));
/** 2026-10-30 → "Fri 30 Oct". */
export const formatDay = (date: string) => dayFormat.format(atUtcMidnight(date));
/** An instant → "27 Oct 2026, 09:00" in UK time. */
export const formatDateTime = (instant: string) => dateTimeFormat.format(new Date(instant)).replace(' at ', ', ');
/** An instant → "10:45" in UK time. */
export const formatTime = (instant: string) => timeFormat.format(new Date(instant));
/** 2026-10 → "Oct 2026". */
export const formatMonth = (month: string) => monthFormat.format(atUtcMidnight(`${month}-01`));
/** 2026-10 → "Oct". */
export const formatMonthShort = (month: string) => monthShortFormat.format(atUtcMidnight(`${month}-01`));
/** 2026-10 → "October 2026". */
export const formatMonthLong = (month: string) => monthLongFormat.format(atUtcMidnight(`${month}-01`));

/**
 * 2026-05 + -3 → 2026-02. Kept here rather than imported from @hrd/core, so the calculation code
 * stays in the lazily loaded mock-data chunk and `api` mode never downloads it.
 */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const i = y! * 12 + (m! - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}

/** 3.5 → "3.5", 7 → "7", with "days"/"day". */
export function formatDays(days: number): string {
  const n = Number.isInteger(days) ? String(days) : days.toFixed(1);
  return `${n} ${days === 1 ? 'day' : 'days'}`;
}

export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
