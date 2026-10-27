// M10 leavers, M11 starters, M12 monthly attrition rate. Expected: fixtures/expected/attrition.md.
import { describe, expect, it } from 'vitest';
import { leaverCounts } from '../../src/metrics/leavers';
import { starterCounts } from '../../src/metrics/starters';
import { monthlyAttritionRate } from '../../src/metrics/monthlyAttrition';
import { employee, fixtureContext, inlineContext } from '../contextFor';

describe('M10 leavers (fixtures)', () => {
  it.each([
    ['2026-07', { actual: 0, known: 0 }],
    ['2026-08', { actual: 1, known: 0 }],
    ['2026-10', { actual: 1, known: 0 }], // E12 leaves today: actual
    ['2026-12', { actual: 0, known: 1 }], // E11 serving notice
    ['2025-12', { actual: 1, known: 0 }],
  ])('%s', (month, expected) => {
    expect(leaverCounts(fixtureContext(), month)).toEqual(expected);
  });

  it('takes each leaver’s department at their end date (D3)', () => {
    expect(leaverCounts(fixtureContext({ department: 'Sales' }), '2026-08')).toEqual({ actual: 1, known: 0 });
    expect(leaverCounts(fixtureContext({ department: 'Sales' }), '2026-12')).toEqual({ actual: 0, known: 0 });
  });
});

describe('M11 starters (fixtures)', () => {
  it('counts a future start date as a known starter', () => {
    expect(starterCounts(fixtureContext(), '2026-11')).toEqual({ actual: 0, known: 1 });
    expect(starterCounts(fixtureContext(), '2025-11')).toEqual({ actual: 1, known: 0 }); // T04
  });
});

describe('M12 monthly attrition rate (fixtures)', () => {
  it.each([
    ['2026-07', 0],
    ['2026-08', (1 / 14.5) * 100],
    ['2026-09', 0],
    ['2026-10', (1 / 14) * 100], // to date: headcount today in place of the last day
  ])('%s', (month, expected) => {
    const r = monthlyAttritionRate(fixtureContext(), month);
    expect(r.percent).toBeCloseTo(expected, 10);
    expect(r.noStaff).toBe(false);
  });

  it('uses each day’s department: Sales in August is 1 ÷ ((5 + 4) ÷ 2)', () => {
    expect(monthlyAttritionRate(fixtureContext({ department: 'Sales' }), '2026-08').percent).toBeCloseTo((1 / 4.5) * 100, 10);
  });

  it('is not shown for future months', () => {
    expect(monthlyAttritionRate(fixtureContext(), '2026-11')).toEqual({ percent: null, noStaff: false });
  });

  it('says "No staff in this group" when the headcount is 0', () => {
    const e = employee({ department: 'Analysis' });
    const r = monthlyAttritionRate(inlineContext({ employees: [e] }, { filter: { department: 'Sales' } }), '2026-09');
    expect(r).toEqual({ percent: null, noStaff: true });
  });
});
