// M06 annual leave days per month. Expected values from fixtures/expected/leave.md.
import { describe, expect, it } from 'vitest';
import { leaveDays } from '../../src/metrics/leaveDays';
import { absence, employee, fixtureContext, inlineContext } from '../contextFor';

describe('M06 annual leave days (fixtures)', () => {
  it.each([
    ['2026-07', 7],
    ['2026-08', 7], // includes leave over the 31 Aug bank holiday, which counts 0
    ['2026-09', 11],
    ['2026-10', 9.5], // taken to date, booked for the rest of October, and a morning
    ['2026-11', 7], // includes an afternoon start and a morning end
    ['2026-12', 12], // over Christmas bank holidays
    ['2027-01', 5],
  ])('%s → %f', (month, expected) => {
    expect(leaveDays(fixtureContext(), month)).toBeCloseTo(expected, 10);
  });

  it('splits leave across months and leaves public holidays out', () => {
    const ctx = fixtureContext();
    // E01's 30 Jul – 4 Aug gives Jul 2 and Aug 2; E10's "Bank holiday" adds nothing to August.
    expect(leaveDays(ctx, '2026-07') - 5).toBe(2);
  });

  it('is 0, not missing, for a month with no bookings', () => {
    const e = employee();
    expect(leaveDays(inlineContext({ employees: [e] }), '2026-12')).toBe(0);
  });

  it('counts each day for the group the person was in on that day (D3)', () => {
    // E04 (Sales since Aug 2026) has leave on 6–10 Nov: 2 days for Sales; E01 has 16–20 Nov: 5.
    expect(leaveDays(fixtureContext({ department: 'Sales' }), '2026-11')).toBe(7);
    expect(leaveDays(fixtureContext({ department: 'Pricing' }), '2026-11')).toBe(0);
  });
});

describe('M06 edge cases', () => {
  it('counts half days as 0.5', () => {
    const e = employee();
    const ctx = inlineContext({
      employees: [e],
      absences: [absence(e.employeeId, { startDate: '2026-10-27', startPart: 'SecondHalf', endDate: '2026-10-27', endPart: 'SecondHalf' })],
    });
    expect(leaveDays(ctx, '2026-10')).toBe(0.5);
  });
});
