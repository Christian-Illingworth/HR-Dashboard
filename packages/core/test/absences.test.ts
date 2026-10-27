// D5 (categories) and D1 (working-day fractions) from docs/metric-catalogue.md.
// Expected values worked out by hand from the 2026 calendar.
import { describe, expect, it } from 'vitest';
import { categorise } from '../src/absences/category';
import { absenceSpans } from '../src/absences/spans';
import type { AbsenceRecord, AbsenceTypeMapping } from '../src/records/types';

const map: AbsenceTypeMapping[] = [
  { displayName: 'Bank holiday', category: 'publicHoliday' },
  { displayName: 'bank HOLIDAY', category: 'annualLeave' },
  { displayName: 'Compassionate leave', category: 'compassionate' },
  { displayName: 'Unpaid leave', category: 'unpaid' },
  { displayName: 'Sickness', category: 'other' },
];

describe('D5 absence category', () => {
  it('always treats Sickness as sickness', () => {
    expect(categorise('Sickness', 'Sickness', map)).toBe('sickness');
  });
  it('uses the first matching map line, ignoring case', () => {
    expect(categorise('Holiday', 'BANK HOLIDAY', map)).toBe('publicHoliday');
    expect(categorise('Other', 'compassionate leave', map)).toBe('compassionate');
    expect(categorise('Other', 'Unpaid leave', map)).toBe('unpaid');
  });
  it('falls back to defaults by $type', () => {
    expect(categorise('Holiday', 'Annual leave', map)).toBe('annualLeave');
    expect(categorise('Toil', 'TOIL', map)).toBe('other');
    expect(categorise('Other', 'Paternity leave', map)).toBe('other');
    expect(categorise('Study', 'Study leave', map)).toBe('other'); // unknown $type
    expect(categorise('Holiday', 'Annual leave', [])).toBe('annualLeave');
  });
});

let seq = 0;
function absence(over: Partial<AbsenceRecord>): AbsenceRecord {
  seq += 1;
  return {
    absenceId: `a${seq}`,
    employeeId: 'e1',
    brightHrType: 'Holiday',
    displayName: 'Annual leave',
    startDate: '2026-10-26',
    startPart: 'FullDay',
    endDate: '2026-10-30',
    endPart: 'FullDay',
    durationDays: null,
    durationMinutes: null,
    pregnancyRelated: false,
    ...over,
  };
}
const opts = { today: '2026-10-27', standardDayHours: 7.5 };
const total = (a: AbsenceRecord) => absenceSpans(a, opts).reduce((s, d) => s + d.fraction, 0);

describe('D1 working-day fractions', () => {
  it('counts every working day as 1 (Mon 26 – Fri 30 Oct 2026 = 5)', () => {
    const spans = absenceSpans(absence({}), opts);
    expect(spans.map((s) => s.date)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
    ]);
    expect(spans.every((s) => s.fraction === 1)).toBe(true);
  });

  it('counts weekends and bank holidays as 0 (24 Aug – 4 Sep 2026 = 9)', () => {
    const spans = absenceSpans(absence({ startDate: '2026-08-24', endDate: '2026-09-04' }), opts);
    expect(spans).toHaveLength(9);
    expect(spans.find((s) => s.date === '2026-08-31')).toBeUndefined();
  });

  it('counts only the afternoon of a SecondHalf start and the morning of a FirstHalf end', () => {
    // Fri 6 Nov afternoon (0.5), Mon 9 Nov (1), Tue 10 Nov morning (0.5) = 2
    const a = absence({ startDate: '2026-11-06', startPart: 'SecondHalf', endDate: '2026-11-10', endPart: 'FirstHalf' });
    expect(absenceSpans(a, opts)).toEqual([
      { date: '2026-11-06', fraction: 0.5 },
      { date: '2026-11-09', fraction: 1 },
      { date: '2026-11-10', fraction: 0.5 },
    ]);
  });

  it('counts a FirstHalf start and a SecondHalf end of a longer absence as whole days', () => {
    const a = absence({ startDate: '2026-11-02', startPart: 'FirstHalf', endDate: '2026-11-03', endPart: 'SecondHalf' });
    expect(total(a)).toBe(2);
  });

  it('counts a one-day morning or afternoon as 0.5, and morning-to-afternoon as 1', () => {
    expect(total(absence({ startDate: '2026-10-27', startPart: 'FirstHalf', endDate: '2026-10-27', endPart: 'FirstHalf' }))).toBe(0.5);
    expect(total(absence({ startDate: '2026-10-27', startPart: 'SecondHalf', endDate: '2026-10-27', endPart: 'SecondHalf' }))).toBe(0.5);
    expect(total(absence({ startDate: '2026-10-27', startPart: 'FirstHalf', endDate: '2026-10-27', endPart: 'SecondHalf' }))).toBe(1);
  });

  it('counts a same-day Time absence as 0.5 and a multi-day Time absence as whole days', () => {
    expect(total(absence({ startDate: '2026-09-10', startPart: 'Time', endDate: '2026-09-10', endPart: 'Time' }))).toBe(0.5);
    expect(total(absence({ startDate: '2026-09-10', startPart: 'Time', endDate: '2026-09-11', endPart: 'Time' }))).toBe(2);
  });

  it('scales sickness days so they add up to durationDays', () => {
    // Mon 10 – Wed 12 Aug 2026 is 3 working days; BrightHR says 2 days, so each day is 2/3.
    const a = absence({ brightHrType: 'Sickness', displayName: 'Sickness', startDate: '2026-08-10', endDate: '2026-08-12', durationDays: 2 });
    const spans = absenceSpans(a, opts);
    expect(spans).toHaveLength(3);
    spans.forEach((s) => expect(s.fraction).toBeCloseTo(2 / 3, 10));
    expect(total(a)).toBeCloseTo(2, 10);
  });

  it('converts durationMinutes ÷ (StandardDayHours × 60)', () => {
    // 900 minutes ÷ (7.5 × 60) = 2 days, over Mon 8 – Tue 9 Dec 2025 (2 working days).
    const a = absence({ brightHrType: 'Sickness', startDate: '2025-12-08', endDate: '2025-12-09', durationMinutes: 900 });
    expect(total(a)).toBeCloseTo(2, 10);
    // With an 8-hour day the same 900 minutes is 1.875 days.
    expect(absenceSpans(a, { ...opts, standardDayHours: 8 }).reduce((s, d) => s + d.fraction, 0)).toBeCloseTo(1.875, 10);
  });

  it('uses the calendar count when sickness has no duration', () => {
    // Thu 2 – Tue 7 Apr 2026, over Good Friday and Easter Monday = 2 working days.
    const a = absence({ brightHrType: 'Sickness', startDate: '2026-04-02', endDate: '2026-04-07' });
    expect(total(a)).toBe(2);
  });

  it('counts open-ended sickness up to today and ignores its duration', () => {
    // Thu 22, Fri 23, Mon 26, Tue 27 Oct 2026 = 4
    const a = absence({ brightHrType: 'Sickness', startDate: '2026-10-22', endDate: null, endPart: null, durationDays: 9 });
    expect(total(a)).toBe(4);
    expect(absenceSpans(absence({ brightHrType: 'Sickness', startDate: '2026-10-29', endDate: null, endPart: null }), opts)).toEqual([]);
  });

  it('has nothing to spread when sickness falls only on non-working days', () => {
    const a = absence({ brightHrType: 'Sickness', startDate: '2026-10-24', endDate: '2026-10-25', durationDays: 1 });
    expect(absenceSpans(a, opts)).toEqual([]);
  });
});
