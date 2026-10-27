// D3 group membership and D6 headcount (docs/metric-catalogue.md#d3, #d6). Worked out by hand.
import { describe, expect, it } from 'vitest';
import { createMembership, inGroup } from '../src/metrics/membership';
import { headcountOn, isEmployedOn } from '../src/metrics/headcountAt';
import type { EmployeeHistoryRow, EmployeeRecord } from '../src/records/types';

const emp = (employeeId: string, over: Partial<EmployeeRecord> = {}): EmployeeRecord => ({
  employeeId,
  startDate: '2020-01-06',
  endDate: null,
  jobTitle: 'Energy Analyst',
  department: 'Sales',
  givenName: null,
  familyName: null,
  ...over,
});
const row = (employeeId: string, month: string, department: string, jobTitle = 'Energy Analyst'): EmployeeHistoryRow => ({
  employeeId,
  month,
  department,
  jobTitle,
});

const today = '2026-10-27';

describe('D3 group membership', () => {
  const employees = [emp('x'), emp('y', { department: 'Pricing', jobTitle: 'Senior Pricing Specialist' })];
  const history = [row('x', '2026-07', 'Analysis'), row('x', '2026-09', 'Sales')];
  const m = createMembership(employees, history, today);

  it('uses current values for today and the future, and for any day in the current month', () => {
    expect(m.at('x', '2026-10-27').department).toBe('Sales');
    expect(m.at('x', '2026-11-15').department).toBe('Sales');
    expect(m.at('x', '2026-10-02').department).toBe('Sales');
  });

  it('uses the history row for a past month, or the latest row before it', () => {
    expect(m.at('x', '2026-07-15').department).toBe('Analysis');
    expect(m.at('x', '2026-08-15').department).toBe('Analysis'); // no August row: July's applies
    expect(m.at('x', '2026-09-30').department).toBe('Sales');
  });

  it('uses the earliest row before the first row, and current values with no rows', () => {
    expect(m.at('x', '2026-03-10').department).toBe('Analysis');
    expect(m.at('y', '2026-03-10')).toEqual({ department: 'Pricing', jobTitle: 'Senior Pricing Specialist' });
  });

  it('reports when department history starts', () => {
    expect(m.departmentHistoryStartMonth).toBe('2026-07');
    expect(createMembership(employees, [], today).departmentHistoryStartMonth).toBeNull();
  });

  it('matches department and role filters, with "All" matching everything', () => {
    const g = { department: 'Sales', jobTitle: 'Energy Analyst' };
    expect(inGroup(g, { department: 'All', role: 'All' })).toBe(true);
    expect(inGroup(g, { department: 'Sales', role: 'All' })).toBe(true);
    expect(inGroup(g, { department: 'Sales', role: 'Senior Energy Analyst' })).toBe(false);
    expect(inGroup(g, { department: 'Pricing', role: 'All' })).toBe(false);
  });
});

describe('D6 headcount', () => {
  const a = emp('a');
  const leaverToday = emp('b', { endDate: '2026-10-27' });
  const futureStarter = emp('c', { startDate: '2026-11-16', department: 'Pricing' });
  const m = createMembership([a, leaverToday, futureStarter], [], today);

  it('counts a leaver on their last day but not a future starter', () => {
    expect(isEmployedOn(leaverToday, '2026-10-27')).toBe(true);
    expect(isEmployedOn(leaverToday, '2026-10-28')).toBe(false);
    expect(isEmployedOn(futureStarter, '2026-10-27')).toBe(false);
    expect(isEmployedOn(futureStarter, '2026-11-16')).toBe(true);
    expect(headcountOn([a, leaverToday, futureStarter], '2026-10-27', { department: 'All', role: 'All' }, m)).toBe(2);
    expect(headcountOn([a, leaverToday, futureStarter], '2026-11-16', { department: 'Pricing', role: 'All' }, m)).toBe(1);
  });
});
