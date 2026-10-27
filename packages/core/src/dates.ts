// Pure date arithmetic on YYYY-MM-DD and YYYY-MM strings. Dates have no time zone: they are
// UK calendar dates, as BrightHR gives them. Nothing here reads the clock.

import type { IsoDate } from './brighthr/types';
import type { Month } from './records/types';

const MS_PER_DAY = 86_400_000;

function parts(date: IsoDate): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y!, m!, d!];
}

/** Days since 1970-01-01 for a calendar date. */
export function dayNumber(date: IsoDate): number {
  const [y, m, d] = parts(date);
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

export function fromDayNumber(n: number): IsoDate {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromDayNumber(dayNumber(date) + days);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: IsoDate): number {
  return new Date(dayNumber(date) * MS_PER_DAY).getUTCDay();
}

export function monthOf(date: IsoDate): Month {
  return date.slice(0, 7);
}

export function addMonths(month: Month, n: number): Month {
  const [y, m] = month.split('-').map(Number);
  const index = y! * 12 + (m! - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function daysInMonth(month: Month): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y!, m!, 0)).getUTCDate();
}

export function firstDayOfMonth(month: Month): IsoDate {
  return `${month}-01`;
}

export function lastDayOfMonth(month: Month): IsoDate {
  return `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
}

/** Same day n months away; if that day doesn't exist, the last day of that month. */
export function addMonthsClamped(date: IsoDate, n: number): IsoDate {
  const month = addMonths(monthOf(date), n);
  const day = Math.min(parts(date)[2], daysInMonth(month));
  return `${month}-${String(day).padStart(2, '0')}`;
}

/** Months from `from` to `to` inclusive, oldest first. */
export function monthsBetween(from: Month, to: Month): Month[] {
  const out: Month[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}

export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

export function minDate(a: IsoDate, b: IsoDate): IsoDate {
  return a < b ? a : b;
}
