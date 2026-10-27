// M13 sickness forecast. Expected values from fixtures/expected/forecast-sickness.md.
// Quote: "basis months = the 12 months before the current month whose coverage (D4) is `full`".
import { describe, expect, it } from 'vitest';
import { sicknessForecast } from '../../src/forecast/sickness';
import { fixtureContext } from '../contextFor';

describe('M13 sickness forecast', () => {
  it('averages 12 full months: 40 ÷ 12 days and 16 ÷ 12 episodes', () => {
    const f = sicknessForecast(fixtureContext());
    expect(f.days).toBeCloseTo(40 / 12, 10);
    expect(f.episodes).toBeCloseTo(16 / 12, 10);
    expect(f).toMatchObject({ basisMonths: 12, notEnoughHistory: false });
  });

  it('uses each basis month’s group membership (Sales: 7 ÷ 12 days, 3 ÷ 12 episodes)', () => {
    const f = sicknessForecast(fixtureContext({ department: 'Sales' }));
    expect(f.days).toBeCloseTo(7 / 12, 10);
    expect(f.episodes).toBeCloseTo(3 / 12, 10);
  });

  it('gives no forecast with fewer than 3 full months (launch: Aug and Sep only)', () => {
    expect(sicknessForecast(fixtureContext({}, { launch: true }))).toEqual({
      days: null,
      episodes: null,
      basisMonths: 2,
      notEnoughHistory: true,
    });
  });
});
