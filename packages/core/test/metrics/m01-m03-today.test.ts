// M01 headcount, M02 on leave today, M03 off sick today. Expected values from
// fixtures/expected/kpis.md (worked out by hand) and inline edge cases.
import { describe, expect, it } from 'vitest';
import { headcount } from '../../src/metrics/headcount';
import { onLeaveToday } from '../../src/metrics/onLeaveToday';
import { offSickToday } from '../../src/metrics/offSickToday';
import { absence, employee, fixtureContext, inlineContext } from '../contextFor';

const filters = {
  all: {},
  sales: { department: 'Sales' },
  sea: { role: 'Senior Energy Analyst' },
  empty: { department: 'Sales', role: 'Senior Pricing Specialist' },
};

describe('M01 headcount (fixtures)', () => {
  it.each([
    ['all', 14],
    ['sales', 4],
    ['sea', 4],
    ['empty', 0],
  ] as const)('%s → %i', (f, expected) => {
    expect(headcount(fixtureContext(filters[f]))).toBe(expected);
  });
});

describe('M02 on leave today (fixtures)', () => {
  it.each([
    ['all', 2],
    ['sales', 1],
    ['sea', 1],
    ['empty', 0],
  ] as const)('%s → %i', (f, expected) => {
    expect(onLeaveToday(fixtureContext(filters[f]))).toBe(expected);
  });
});

describe('M03 off sick today (fixtures)', () => {
  it.each([
    ['all', 2],
    ['sales', 1],
    ['sea', 1],
    ['empty', 0],
  ] as const)('%s → %i', (f, expected) => {
    expect(offSickToday(fixtureContext(filters[f]))).toBe(expected);
  });
});

describe('M02 edge cases', () => {
  it('counts a morning-only absence', () => {
    const e = employee();
    expect(onLeaveToday(inlineContext({ employees: [e], absences: [absence(e.employeeId, { startPart: 'FirstHalf', endPart: 'FirstHalf' })] }))).toBe(1);
  });

  it('counts a person with two overlapping leave records once', () => {
    const e = employee();
    const ctx = inlineContext({
      employees: [e],
      absences: [absence(e.employeeId, { startDate: '2026-10-26', endDate: '2026-10-27' }), absence(e.employeeId, { startDate: '2026-10-27', endDate: '2026-10-28' })],
    });
    expect(onLeaveToday(ctx)).toBe(1);
  });

  it('does not count public holidays or other absence types', () => {
    const e = employee();
    const ctx = inlineContext({
      employees: [e],
      absences: [
        absence(e.employeeId, { displayName: 'Bank holiday' }),
        absence(e.employeeId, { brightHrType: 'Toil', displayName: 'TOIL' }),
      ],
    });
    expect(onLeaveToday(ctx)).toBe(0);
  });

  it('is 0 when today is not a working day', () => {
    const e = employee();
    const ctx = inlineContext(
      { employees: [e], absences: [absence(e.employeeId, { startDate: '2026-10-23', endDate: '2026-10-26' })] },
      { today: '2026-10-24' }, // Saturday
    );
    expect(onLeaveToday(ctx)).toBe(0);
  });
});

describe('M03 edge cases', () => {
  const sick = (employeeId: string, over = {}) => absence(employeeId, { brightHrType: 'Sickness', displayName: 'Sickness', ...over });

  it('counts a half day', () => {
    const e = employee();
    expect(offSickToday(inlineContext({ employees: [e], absences: [sick(e.employeeId, { startPart: 'SecondHalf', endPart: 'SecondHalf' })] }))).toBe(1);
  });

  it('does not count sickness that starts tomorrow', () => {
    const e = employee();
    expect(offSickToday(inlineContext({ employees: [e], absences: [sick(e.employeeId, { startDate: '2026-10-28', endDate: '2026-10-29' })] }))).toBe(0);
  });

  it('counts pregnancy-related sickness (it is left out of the Bradford Factor only)', () => {
    const e = employee();
    expect(offSickToday(inlineContext({ employees: [e], absences: [sick(e.employeeId, { pregnancyRelated: true })] }))).toBe(1);
  });

  it('is 0 on a bank holiday', () => {
    const e = employee();
    const ctx = inlineContext({ employees: [e], absences: [sick(e.employeeId, { startDate: '2026-12-24', endDate: null, endPart: null })] }, { today: '2026-12-25' });
    expect(offSickToday(ctx)).toBe(0);
  });
});
