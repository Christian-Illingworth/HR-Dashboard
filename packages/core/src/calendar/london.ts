// Europe/London clock helpers. Instants are ISO strings passed in by the caller; nothing here
// reads the system clock. "Today" for every calculation is the London date (research R12).

import type { IsoDate } from '../brighthr/types';

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

interface LondonParts {
  date: IsoDate;
  hour: number;
  minute: number;
}

export function londonParts(instant: string): LondonParts {
  const p = Object.fromEntries(
    formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
}

export function toLondonDate(instant: string): IsoDate {
  return londonParts(instant).date;
}

export function londonHour(instant: string): number {
  return londonParts(instant).hour;
}

/** The UTC instant of a London wall-clock time. London is UTC+0 (GMT) or UTC+1 (BST). */
export function londonTimeToUtc(date: IsoDate, hour: number, minute: number): string {
  const [y, m, d] = date.split('-').map(Number);
  for (const offsetHours of [0, 1]) {
    const candidate = new Date(Date.UTC(y!, m! - 1, d!, hour - offsetHours, minute)).toISOString();
    const back = londonParts(candidate);
    if (back.date === date && back.hour === hour && back.minute === minute) return candidate;
  }
  // A time skipped by the clocks going forward: use the GMT reading.
  return new Date(Date.UTC(y!, m! - 1, d!, hour, minute)).toISOString();
}
