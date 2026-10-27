// M07 sickness days and M08 sickness episodes per month. Expected: fixtures/expected/sickness.md.
import { describe, expect, it } from 'vitest';
import { sicknessDays } from '../../src/metrics/sicknessDays';
import { sicknessEpisodeCount } from '../../src/metrics/sicknessEpisodes';
import { absence, employee, fixtureContext, inlineContext } from '../contextFor';

describe('M07 sickness days (fixtures)', () => {
  it.each([
    ['2025-10', 2],
    ['2025-12', 3],
    ['2026-02', 4],
    ['2026-04', 2], // over Good Friday and Easter Monday
    ['2026-05', 4], // pregnancy-related sickness is included here
    ['2026-06', 2], // first two days of a Jun–Jul absence
    ['2026-07', 5],
    ['2026-08', 2], // BrightHR's 2 days spread over 3 working days
    ['2026-09', 5],
    ['2026-10', 6.5], // to date: includes open-ended sickness up to today and a half day
  ])('%s → %f', (month, expected) => {
    expect(sicknessDays(fixtureContext(), month)).toBeCloseTo(expected, 10);
  });
});

describe('M08 sickness episodes (fixtures)', () => {
  it.each([
    ['2025-12', 2],
    ['2026-02', 2], // the Fri + Mon pair counts once
    ['2026-06', 1], // the Jun–Jul absence counts in June only
    ['2026-07', 1],
    ['2026-09', 2],
    ['2026-10', 2],
  ])('%s → %i', (month, expected) => {
    expect(sicknessEpisodeCount(fixtureContext(), month)).toBe(expected);
  });
});

describe('M07/M08 edge cases', () => {
  const sick = (id: string, over = {}) => absence(id, { brightHrType: 'Sickness', displayName: 'Sickness', ...over });

  it('does not count sickness days after today', () => {
    // Sick Mon 26 – Fri 30 Oct with a known end: only 26 and 27 are actual on 27 Oct.
    const e = employee();
    const ctx = inlineContext({ employees: [e], absences: [sick(e.employeeId, { startDate: '2026-10-26', endDate: '2026-10-30' })] });
    expect(sicknessDays(ctx, '2026-10')).toBe(2);
    expect(sicknessDays(ctx, '2026-11')).toBe(0);
  });

  it('does not count an episode that has not started yet', () => {
    const e = employee();
    const ctx = inlineContext({ employees: [e], absences: [sick(e.employeeId, { startDate: '2026-10-29', endDate: '2026-10-30' })] });
    expect(sicknessEpisodeCount(ctx, '2026-10')).toBe(0);
  });
});
