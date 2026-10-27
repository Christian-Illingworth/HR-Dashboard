// M04 rolling 12-month attrition %. Expected values from fixtures/expected/kpis.md.
import { describe, expect, it } from 'vitest';
import { attrition12m, attritionDates } from '../../src/metrics/attrition12m';
import { employee, fixtureContext, inlineContext } from '../contextFor';

describe('M04 rolling 12-month attrition (fixtures)', () => {
  it('All: 5 leavers ÷ (206 ÷ 13) × 100 = 31.55…%', () => {
    const r = attrition12m(fixtureContext());
    expect(r.leavers).toBe(5);
    expect(r.averageHeadcount).toBeCloseTo(206 / 13, 10);
    expect(r.percent).toBeCloseTo((5 / (206 / 13)) * 100, 10);
    expect(r.noStaff).toBe(false);
  });

  it('Sales: 1 leaver ÷ 4 × 100 = 25%, using each date’s department (D3)', () => {
    const r = attrition12m(fixtureContext({ department: 'Sales' }));
    expect(r.leavers).toBe(1);
    expect(r.averageHeadcount).toBe(4);
    expect(r.percent).toBe(25);
  });

  it('Senior Energy Analyst: no leavers, 0%', () => {
    const r = attrition12m(fixtureContext({ role: 'Senior Energy Analyst' }));
    expect(r).toMatchObject({ leavers: 0, averageHeadcount: 4, percent: 0, noStaff: false });
  });

  it('a group with nobody in it is "No staff in this group", not 0 or an error', () => {
    const r = attrition12m(fixtureContext({ department: 'Sales', role: 'Senior Pricing Specialist' }));
    expect(r).toMatchObject({ leavers: 0, averageHeadcount: 0, percent: null, noStaff: true });
  });
});

describe('M04 edge cases', () => {
  it('measures headcount on today and the same date in each of the previous 12 months', () => {
    expect(attritionDates('2026-10-27')).toEqual([
      '2026-10-27', '2026-09-27', '2026-08-27', '2026-07-27', '2026-06-27', '2026-05-27', '2026-04-27',
      '2026-03-27', '2026-02-27', '2026-01-27', '2025-12-27', '2025-11-27', '2025-10-27',
    ]);
  });

  it('uses the last day of the month when the date does not exist (29 Feb 2028 → 28 Feb 2027)', () => {
    const dates = attritionDates('2028-02-29');
    expect(dates[0]).toBe('2028-02-29');
    expect(dates[12]).toBe('2027-02-28');
    expect(attritionDates('2026-10-31')[1]).toBe('2026-09-30');
  });

  it('counts someone who started and left inside the period, but not a future leaver', () => {
    const stayer = employee();
    const inAndOut = employee({ startDate: '2026-01-05', endDate: '2026-06-30' });
    const future = employee({ endDate: '2026-12-18' });
    const r = attrition12m(inlineContext({ employees: [stayer, inAndOut, future] }));
    expect(r.leavers).toBe(1);
  });
});
