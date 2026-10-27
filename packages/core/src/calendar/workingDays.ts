// Working days: Monday to Friday, excluding England and Wales bank holidays (research R12,
// spec Assumptions). See README.md in this folder for where the bank holidays come from.

import type { IsoDate } from '../brighthr/types';
import { addDays, dayNumber, dayOfWeek, fromDayNumber } from '../dates';
import bundled from './bank-holidays.england-and-wales.json';

export interface WorkingDayCalendar {
  isWorkingDay(date: IsoDate): boolean;
  /** Working days from `from` to `to`, both inclusive. 0 when `from` is after `to`. */
  workingDaysBetween(from: IsoDate, to: IsoDate): number;
  /** Each working day from `from` to `to` inclusive, oldest first. */
  workingDaysIn(from: IsoDate, to: IsoDate): IsoDate[];
  /** The first working day after `date`. */
  nextWorkingDay(date: IsoDate): IsoDate;
  /** The last bank holiday date this calendar knows about. */
  coversUntil: IsoDate;
}

export function createCalendar(bankHolidays: readonly IsoDate[]): WorkingDayCalendar {
  const holidays = new Set(bankHolidays);
  const isWorkingDay = (date: IsoDate) => {
    const dow = dayOfWeek(date);
    return dow !== 0 && dow !== 6 && !holidays.has(date);
  };
  const workingDaysIn = (from: IsoDate, to: IsoDate) => {
    const out: IsoDate[] = [];
    for (let n = dayNumber(from), end = dayNumber(to); n <= end; n++) {
      const date = fromDayNumber(n);
      if (isWorkingDay(date)) out.push(date);
    }
    return out;
  };
  return {
    isWorkingDay,
    workingDaysIn,
    workingDaysBetween: (from, to) => workingDaysIn(from, to).length,
    nextWorkingDay(date) {
      let next = addDays(date, 1);
      while (!isWorkingDay(next)) next = addDays(next, 1);
      return next;
    },
    coversUntil: [...bankHolidays].sort().at(-1) ?? '0000-00-00',
  };
}

/** The calendar used everywhere: the bundled gov.uk England and Wales bank holidays. */
export const calendar = createCalendar(bundled.events.map((e) => e.date));
