// Calendar and date helpers. Expected values worked out by hand from a 2026 calendar and the
// gov.uk England and Wales bank holiday list (fixtures/README.md: "today" is Tue 2026-10-27).
import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  addMonthsClamped,
  dayOfWeek,
  daysInMonth,
  firstDayOfMonth,
  lastDayOfMonth,
  monthOf,
} from '../src/dates';
import { calendar, createCalendar } from '../src/calendar/workingDays';
import { londonHour, londonTimeToUtc, toLondonDate } from '../src/calendar/london';

describe('date helpers', () => {
  it('does day and month arithmetic on YYYY-MM-DD strings', () => {
    expect(addDays('2026-10-27', -363)).toBe('2025-10-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(monthOf('2026-10-27')).toBe('2026-10');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-10', -12)).toBe('2025-10');
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(firstDayOfMonth('2026-11')).toBe('2026-11-01');
    expect(lastDayOfMonth('2026-09')).toBe('2026-09-30');
    expect(dayOfWeek('2026-10-27')).toBe(2); // Tuesday (0 = Sunday)
    expect(dayOfWeek('2026-11-01')).toBe(0); // Sunday
  });

  it('clamps to the last day of the month when the day does not exist', () => {
    expect(addMonthsClamped('2026-10-27', -1)).toBe('2026-09-27');
    expect(addMonthsClamped('2026-10-31', -1)).toBe('2026-09-30');
    expect(addMonthsClamped('2028-02-29', -12)).toBe('2027-02-28');
    expect(addMonthsClamped('2026-10-27', -12)).toBe('2025-10-27');
  });
});

describe('working-day calendar (England and Wales)', () => {
  it('knows weekends and bank holidays', () => {
    expect(calendar.isWorkingDay('2026-10-27')).toBe(true); // Tuesday
    expect(calendar.isWorkingDay('2026-10-24')).toBe(false); // Saturday
    expect(calendar.isWorkingDay('2026-10-25')).toBe(false); // Sunday
    expect(calendar.isWorkingDay('2026-08-31')).toBe(false); // Summer bank holiday
    expect(calendar.isWorkingDay('2026-12-25')).toBe(false); // Christmas Day (Friday)
    expect(calendar.isWorkingDay('2026-12-28')).toBe(false); // Boxing Day substitute (Monday)
    expect(calendar.isWorkingDay('2026-12-29')).toBe(true);
  });

  it('counts working days inclusively', () => {
    expect(calendar.workingDaysBetween('2026-10-26', '2026-10-30')).toBe(5);
    expect(calendar.workingDaysBetween('2026-08-24', '2026-09-04')).toBe(9); // 5 + bank holiday + 4
    expect(calendar.workingDaysBetween('2026-12-21', '2026-12-31')).toBe(7); // 21–24, 29–31
    expect(calendar.workingDaysBetween('2026-04-02', '2026-04-07')).toBe(2); // Good Friday, Easter Monday
    expect(calendar.workingDaysBetween('2026-10-24', '2026-10-24')).toBe(0);
    expect(calendar.workingDaysBetween('2026-10-30', '2026-10-26')).toBe(0);
  });

  it('finds the next working day', () => {
    expect(calendar.nextWorkingDay('2026-10-30')).toBe('2026-11-02'); // Friday → Monday
    expect(calendar.nextWorkingDay('2026-12-24')).toBe('2026-12-29'); // over Christmas
    expect(calendar.nextWorkingDay('2026-12-31')).toBe('2027-01-04'); // over New Year's Day
    expect(calendar.nextWorkingDay('2026-10-27')).toBe('2026-10-28');
  });

  it('reports how far the bundled bank holidays reach', () => {
    expect(calendar.coversUntil).toBe('2028-12-26');
    expect(createCalendar(['2026-01-01']).coversUntil).toBe('2026-01-01');
  });
});

describe('Europe/London clock helpers', () => {
  it('turns an instant into a London date across the BST change (2026-10-25 01:00 UTC)', () => {
    expect(toLondonDate('2026-10-24T23:30:00Z')).toBe('2026-10-25'); // 00:30 BST
    expect(toLondonDate('2026-10-27T23:30:00Z')).toBe('2026-10-27'); // 23:30 GMT
  });

  it('gives the London hour', () => {
    expect(londonHour('2026-07-01T06:00:00Z')).toBe(7); // BST
    expect(londonHour('2026-10-25T00:30:00Z')).toBe(1); // still BST
    expect(londonHour('2026-10-25T01:30:00Z')).toBe(1); // now GMT
    expect(londonHour('2026-10-27T09:00:00Z')).toBe(9); // GMT
  });

  it('turns a London date and time into a UTC instant', () => {
    expect(londonTimeToUtc('2026-07-01', 2, 0)).toBe('2026-07-01T01:00:00.000Z');
    expect(londonTimeToUtc('2026-10-27', 2, 0)).toBe('2026-10-27T02:00:00.000Z');
    expect(londonTimeToUtc('2026-10-27', 10, 30)).toBe('2026-10-27T10:30:00.000Z');
  });
});
