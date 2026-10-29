// M17 length of service (feature 002). Expected values from fixtures/expected/service.md (worked
// out by hand) and inline edge cases. Today is 2026-10-27.
import { describe, expect, it } from 'vitest';
import { completedYears, lengthOfService } from '../../src/metrics/lengthOfService';
import { employee, fixtureContext, inlineContext } from '../contextFor';

const YEAR = 365.25;
const bandCounts = (r: ReturnType<typeof lengthOfService>) => r?.bands.map((b) => b.count);

describe('M17 length of service (fixtures)', () => {
  it('All: average 27465 ÷ 14 days, median (1729 + 1791) ÷ 2 days, bands 0/1/2/2/3/6', () => {
    const r = lengthOfService(fixtureContext())!;
    expect(r.averageYears).toBeCloseTo(27465 / 14 / YEAR, 10);
    expect(r.medianYears).toBeCloseTo(1760 / YEAR, 10);
    expect(r.firstYear).toBe(0);
    expect(bandCounts(r)).toEqual([0, 1, 2, 2, 3, 6]);
    expect(r.bands.map((b) => b.label)).toEqual(['Under 1 yr', '1–2 yrs', '2–3 yrs', '3–4 yrs', '4–5 yrs', '5+ yrs']);
    expect(r.bands.map((b) => b.band)).toEqual(['under1', 'y1', 'y2', 'y3', 'y4', 'y5plus']);
  });

  it('Sales: average 7582 ÷ 4 days, median 1882.5 days, bands 0/0/1/0/1/2', () => {
    const r = lengthOfService(fixtureContext({ department: 'Sales' }))!;
    expect(r.averageYears).toBeCloseTo(7582 / 4 / YEAR, 10);
    expect(r.medianYears).toBeCloseTo(1882.5 / YEAR, 10);
    expect(bandCounts(r)).toEqual([0, 0, 1, 0, 1, 2]);
  });

  it('Senior Energy Analyst: average 11497 ÷ 4 days, median 2882 days, bands 0/0/0/0/1/3', () => {
    const r = lengthOfService(fixtureContext({ role: 'Senior Energy Analyst' }))!;
    expect(r.averageYears).toBeCloseTo(11497 / 4 / YEAR, 10);
    expect(r.medianYears).toBeCloseTo(2882 / YEAR, 10);
    expect(bandCounts(r)).toEqual([0, 0, 0, 0, 1, 3]);
  });

  it('a group with nobody in it gives no figures', () => {
    expect(lengthOfService(fixtureContext({ department: 'Sales', role: 'Senior Pricing Specialist' }))).toBeNull();
  });
});

describe('M17 edge cases', () => {
  it('a start date today is 0 years, in the Under 1 yr band and the first year', () => {
    const r = lengthOfService(inlineContext({ employees: [employee({ startDate: '2026-10-27' })] }))!;
    expect(r.averageYears).toBe(0);
    expect(r.firstYear).toBe(1);
    expect(bandCounts(r)).toEqual([1, 0, 0, 0, 0, 0]);
  });

  it('exactly 1 year today is in the 1–2 yrs band', () => {
    const r = lengthOfService(inlineContext({ employees: [employee({ startDate: '2025-10-27' })] }))!;
    expect(r.firstYear).toBe(0);
    expect(bandCounts(r)).toEqual([0, 1, 0, 0, 0, 0]);
  });

  it('one employee: the average and the median are the same', () => {
    // 2026-07-29 to 2026-10-27 = 3 + 31 + 30 + 26 = 90 days.
    const r = lengthOfService(inlineContext({ employees: [employee({ startDate: '2026-07-29' })] }))!;
    expect(r.averageYears).toBeCloseTo(90 / YEAR, 10);
    expect(r.medianYears).toBe(r.averageYears);
  });

  it('an even count: the median is the mean of the middle two', () => {
    // 10, 20, 30 and 100 days → median (20 + 30) ÷ 2 = 25 days.
    const starts = ['2026-10-17', '2026-10-07', '2026-09-27', '2026-07-19'];
    const r = lengthOfService(inlineContext({ employees: starts.map((startDate) => employee({ startDate })) }))!;
    expect(r.medianYears).toBeCloseTo(25 / YEAR, 10);
    expect(r.averageYears).toBeCloseTo(40 / YEAR, 10);
  });

  it('counts a leaver whose last day is today, but not a future starter', () => {
    const r = lengthOfService(
      inlineContext({ employees: [employee({ startDate: '2026-10-17', endDate: '2026-10-27' }), employee({ startDate: '2026-10-28' })] }),
    )!;
    expect(bandCounts(r)).toEqual([1, 0, 0, 0, 0, 0]);
    expect(r.averageYears).toBeCloseTo(10 / YEAR, 10);
  });

  it('a 29 February start completes its year on 28 February in a year without one', () => {
    expect(completedYears('2024-02-29', '2025-02-27')).toBe(0);
    expect(completedYears('2024-02-29', '2025-02-28')).toBe(1);
    expect(completedYears('2024-02-29', '2028-02-28')).toBe(3);
    expect(completedYears('2024-02-29', '2028-02-29')).toBe(4);
  });

  it('counts whole years only from the anniversary', () => {
    expect(completedYears('2021-12-01', '2026-11-30')).toBe(4);
    expect(completedYears('2021-12-01', '2026-12-01')).toBe(5);
    expect(completedYears('2026-10-27', '2026-10-27')).toBe(0);
  });
});
