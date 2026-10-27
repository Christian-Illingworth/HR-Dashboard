// M14 further-leaver forecast. Expected: fixtures/expected/attrition.md.
// Quote: "basis months = the 12 months before the current month in which the group's headcount
// at the start of the month was more than 0".
import { describe, expect, it } from 'vitest';
import { furtherLeavers, leaverForecast } from '../../src/forecast/leavers';
import { employee, fixtureContext, inlineContext } from '../contextFor';

describe('M14 further leavers', () => {
  it('averages 4 leavers over 12 basis months', () => {
    const f = leaverForecast(fixtureContext());
    expect(f.average).toBeCloseTo(4 / 12, 10);
    expect(f).toMatchObject({ basisMonths: 12, notEnoughHistory: false });
  });

  it('subtracts known leavers and never goes below zero', () => {
    const ctx = fixtureContext();
    expect(furtherLeavers(ctx, '2026-11')).toBeCloseTo(4 / 12, 10);
    expect(furtherLeavers(ctx, '2026-12')).toBe(0); // 1 known leaver > 0.333 average
    expect(furtherLeavers(ctx, '2027-01')).toBeCloseTo(4 / 12, 10);
  });

  it('uses each basis month’s group (Sales: 1 ÷ 12)', () => {
    expect(leaverForecast(fixtureContext({ department: 'Sales' })).average).toBeCloseTo(1 / 12, 10);
  });

  it('is not limited by the 90-day absence history', () => {
    expect(leaverForecast(fixtureContext({}, { launch: true })).average).toBeCloseTo(4 / 12, 10);
  });

  it('gives no forecast for a group with fewer than 3 basis months', () => {
    // Only on payroll from 3 Aug 2026: staffed at the start of September only.
    const e = employee({ startDate: '2026-08-03', department: 'New team' });
    const ctx = inlineContext({ employees: [e] }, { filter: { department: 'New team' } });
    expect(leaverForecast(ctx)).toEqual({ average: null, basisMonths: 1, notEnoughHistory: true });
    expect(furtherLeavers(ctx, '2026-11')).toBeNull();
  });
});
