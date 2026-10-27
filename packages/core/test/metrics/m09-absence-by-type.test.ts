// M09 absence days by type per month. Expected values from fixtures/expected/absence.md.
import { describe, expect, it } from 'vitest';
import { absenceDaysByType } from '../../src/metrics/absenceByType';
import { fixtureContext } from '../contextFor';

describe('M09 absence days by type (fixtures)', () => {
  it.each([
    ['2026-07', { sickness: 5, compassionate: 0, unpaid: 0, other: 1 }], // TOIL is "other"
    ['2026-08', { sickness: 2, compassionate: 3, unpaid: 0, other: 0 }], // bank holiday left out
    ['2026-09', { sickness: 5, compassionate: 0, unpaid: 0, other: 0.5 }], // same-day Time absence
    ['2026-10', { sickness: 6.5, compassionate: 0, unpaid: 0, other: 1 }], // unknown $type "Study"
    ['2026-11', { compassionate: 0, unpaid: 0, other: 10 }], // booked paternity leave
    ['2026-12', { compassionate: 0, unpaid: 2, other: 0 }], // booked unpaid leave
  ])('%s', (month, expected) => {
    const got = absenceDaysByType(fixtureContext(), month);
    for (const [k, v] of Object.entries(expected)) expect(got[k as keyof typeof got]).toBeCloseTo(v, 10);
  });

  it('never includes annual leave', () => {
    // September has 11 days of annual leave and none of it may appear here.
    const sep = absenceDaysByType(fixtureContext(), '2026-09');
    expect(sep.sickness + sep.compassionate + sep.unpaid + sep.other).toBeCloseTo(5.5, 10);
  });
});
