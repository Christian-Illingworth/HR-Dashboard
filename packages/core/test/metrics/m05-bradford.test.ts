// M05 average Bradford Factor. Expected values from fixtures/expected/kpis.md.
import { describe, expect, it } from 'vitest';
import { bradfordAverage } from '../../src/metrics/bradford';
import { absence, employee, fixtureContext, inlineContext } from '../contextFor';

describe('M05 average Bradford Factor (fixtures)', () => {
  it('All: 52.5 ÷ 14 = 3.75 over 2025-10-29 to 2026-10-27', () => {
    const r = bradfordAverage(fixtureContext());
    expect(r.value).toBeCloseTo(3.75, 10);
    expect(r).toMatchObject({ noStaff: false, basisStartDate: '2025-10-29', basisIsPartial: false });
  });

  it.each([
    ['Sales', { department: 'Sales' }, 7],
    ['Senior Energy Analyst', { role: 'Senior Energy Analyst' }, 2.75],
  ])('%s', (_name, filter, expected) => {
    expect(bradfordAverage(fixtureContext(filter)).value).toBeCloseTo(expected, 10);
  });

  it('a group with nobody in it is "No staff in this group"', () => {
    expect(bradfordAverage(fixtureContext({ department: 'Sales', role: 'Senior Pricing Specialist' }))).toMatchObject({
      value: null,
      noStaff: true,
    });
  });

  it('launch scenario: uses data since historyStartDate and says so (13.5 ÷ 14)', () => {
    const r = bradfordAverage(fixtureContext({}, { launch: true }));
    expect(r.value).toBeCloseTo(13.5 / 14, 10);
    expect(r).toMatchObject({ basisStartDate: '2026-07-29', basisIsPartial: true });
  });
});

describe('M05 edge cases', () => {
  const sick = (employeeId: string, over = {}) =>
    absence(employeeId, { brightHrType: 'Sickness', displayName: 'Sickness', ...over });

  it('counts an episode that started before the basis period in S, but only its days inside it in D', () => {
    // Basis starts 2025-10-29. Sick Mon 27 – Thu 30 Oct 2025: S = 1, D = 2 (29th, 30th) → 2.
    const e = employee();
    const r = bradfordAverage(inlineContext({ employees: [e], absences: [sick(e.employeeId, { startDate: '2025-10-27', endDate: '2025-10-30' })] }));
    expect(r.value).toBe(2);
  });

  it('includes a starter part-way through the period, with their own days only', () => {
    // a: two 1-day episodes → 2² × 2 = 8. b (started 2026-06-01): one 3-day episode → 3. (8 + 3) ÷ 2 = 5.5
    const a = employee();
    const b = employee({ startDate: '2026-06-01' });
    const r = bradfordAverage(
      inlineContext({
        employees: [a, b],
        absences: [
          sick(a.employeeId, { startDate: '2026-03-03', endDate: '2026-03-03' }),
          sick(a.employeeId, { startDate: '2026-09-08', endDate: '2026-09-08' }),
          sick(b.employeeId, { startDate: '2026-07-07', endDate: '2026-07-09' }),
        ],
      }),
    );
    expect(r.value).toBe(5.5);
  });

  it('leaves out pregnancy-related episodes and counts merged episodes once', () => {
    // Fri 6 + Mon 9 Feb merge (S = 1, D = 2 → 2); a pregnancy-related episode adds nothing.
    const e = employee();
    const r = bradfordAverage(
      inlineContext({
        employees: [e],
        absences: [
          sick(e.employeeId, { startDate: '2026-02-06', endDate: '2026-02-06' }),
          sick(e.employeeId, { startDate: '2026-02-09', endDate: '2026-02-09' }),
          sick(e.employeeId, { startDate: '2026-05-11', endDate: '2026-05-13', pregnancyRelated: true }),
        ],
      }),
    );
    expect(r.value).toBe(2);
  });
});
