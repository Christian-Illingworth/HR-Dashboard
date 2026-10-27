// M15 "Who's off in Sales". Expected values from fixtures/expected/sales.md (worked out by hand).
import { describe, expect, it } from 'vitest';
import { salesAbsences } from '../../src/metrics/salesAbsences';
import { absence, employee, fixtureContext, inlineContext } from '../contextFor';

const S18 = 'a0000000-0000-4000-8000-000000000218';
const reasons = [{ absenceId: S18, reason: 'Back pain' }];

const chloe = {
  name: 'Chloe Patel',
  role: 'Senior Energy Analyst',
  absenceType: 'Sickness',
  sicknessReason: 'Back pain',
  start: { date: '2026-10-22', part: 'FullDay' },
  end: null,
  returnDate: null,
  status: 'Approved',
};
const ben = {
  name: 'Ben Okafor',
  role: 'Energy Analyst',
  absenceType: 'Annual leave',
  sicknessReason: null,
  start: { date: '2026-10-26', part: 'FullDay' },
  end: { date: '2026-10-30', part: 'FullDay' },
  returnDate: '2026-11-02',
  status: 'Approved',
};
const daniel = {
  name: 'Daniel Reyes',
  role: 'Energy Analyst',
  absenceType: 'Annual leave',
  sicknessReason: null,
  start: { date: '2026-11-06', part: 'SecondHalf' },
  end: { date: '2026-11-10', part: 'FirstHalf' },
  returnDate: '2026-11-10',
  status: 'Approved',
};

describe('M15 who is off in Sales (fixtures)', () => {
  it('lists today and the next 14 days, sorted by start date then family name', () => {
    const r = salesAbsences(fixtureContext({}, { reasons }));
    expect(r.today).toEqual([chloe, ben]);
    expect(r.upcoming).toEqual([chloe, ben, daniel]);
    expect(r).toMatchObject({ outsideFilter: false, departmentsNotFound: [], pendingAvailable: false });
  });

  it('does not list leave starting 20 days from today', () => {
    const r = salesAbsences(fixtureContext({}, { reasons }));
    expect(r.upcoming.map((e) => e.name)).not.toContain('Amelia Hart');
  });

  it('applies the role filter', () => {
    const r = salesAbsences(fixtureContext({ role: 'Energy Analyst' }, { reasons }));
    expect(r.today).toEqual([ben]);
    expect(r.upcoming).toEqual([ben, daniel]);
    const managers = salesAbsences(fixtureContext({ role: 'Sales Team Manager' }, { reasons }));
    expect(managers).toMatchObject({ today: [], upcoming: [], outsideFilter: false });
  });

  it('says Sales is outside the filter when the department filter excludes it', () => {
    expect(salesAbsences(fixtureContext({ department: 'Pricing' }, { reasons }))).toMatchObject({ outsideFilter: true, today: [], upcoming: [] });
    expect(salesAbsences(fixtureContext({ department: 'Sales' }, { reasons })).outsideFilter).toBe(false);
  });

  it('names Sales department settings that match nobody', () => {
    const r = salesAbsences(
      fixtureContext({}, { reasons, rawSettings: { SalesDepartments: 'Sales\nSales Ops', AbsenceTypeMap: 'Bank holiday => publicHoliday' } }),
    );
    expect(r.departmentsNotFound).toEqual(['Sales Ops']);
    expect(r.today).toHaveLength(2);
  });

  it('shows a reason only when one is stored', () => {
    expect(salesAbsences(fixtureContext({}, { reasons: [] })).today[0]!.sicknessReason).toBeNull();
  });
});

describe('M15 edge cases', () => {
  const sales = (over = {}) => employee({ department: 'Sales', givenName: 'Test', familyName: 'Person', ...over });

  it('does not list public holidays or leavers', () => {
    const e = sales();
    const gone = sales({ endDate: '2026-10-20', familyName: 'Gone' });
    const ctx = inlineContext({
      employees: [e, gone],
      absences: [absence(e.employeeId, { displayName: 'Bank holiday' }), absence(gone.employeeId, { startDate: '2026-10-27', endDate: '2026-10-28' })],
    });
    expect(salesAbsences(ctx)).toMatchObject({ today: [], upcoming: [] });
  });

  it('lists someone off today and tomorrow on both tabs', () => {
    const e = sales();
    const r = salesAbsences(inlineContext({ employees: [e], absences: [absence(e.employeeId, { startDate: '2026-10-27', endDate: '2026-10-28' })] }));
    expect(r.today).toHaveLength(1);
    expect(r.upcoming).toHaveLength(1);
  });

  it('includes an absence starting on day 14 and excludes one starting on day 15', () => {
    const e = sales();
    const r = salesAbsences(
      inlineContext({
        employees: [e],
        absences: [
          absence(e.employeeId, { startDate: '2026-11-10', endDate: '2026-11-10' }),
          absence(e.employeeId, { startDate: '2026-11-11', endDate: '2026-11-11' }),
        ],
      }),
    );
    expect(r.upcoming.map((x) => x.start.date)).toEqual(['2026-11-10']);
  });

  it('returns over Christmas to the next working day', () => {
    const e = sales();
    const r = salesAbsences(
      inlineContext({ employees: [e], absences: [absence(e.employeeId, { startDate: '2026-12-21', endDate: '2026-12-24' })] }, { today: '2026-12-21' }),
    );
    expect(r.today[0]!.returnDate).toBe('2026-12-29');
  });

  it('matches Sales department names ignoring case', () => {
    const e = sales({ department: 'SALES' });
    const r = salesAbsences(inlineContext({ employees: [e], absences: [absence(e.employeeId)] }));
    expect(r.today).toHaveLength(1);
  });
});
