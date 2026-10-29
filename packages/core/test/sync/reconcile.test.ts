// T102: reconciliation, retention and history (research R11, data-model §2 state transitions).
// Today is 2026-10-27; the fetched window is 2026-07-29 (today − 90) to 2027-01-31.
import { describe, expect, it } from 'vitest';
import { reconcileAbsences } from '../../src/sync/reconcile';
import { retentionDeletes } from '../../src/sync/retention';
import { currentHistoryRows, nextHistoryStartDate } from '../../src/sync/history';
import type { AbsenceRecord, EmployeeRecord } from '../../src/records/types';

const abs = (absenceId: string, employeeId: string, startDate: string, endDate: string | null): AbsenceRecord => ({
  absenceId, employeeId, brightHrType: 'Holiday', displayName: 'Annual leave', startDate, startPart: 'FullDay',
  endDate, endPart: endDate ? 'FullDay' : null, durationDays: null, durationMinutes: null, pregnancyRelated: false,
});
const emp = (employeeId: string, startDate: string, endDate: string | null): EmployeeRecord => ({
  employeeId, startDate, endDate, jobTitle: 'Energy Analyst', department: 'Sales', givenName: null, familyName: null,
});
const window = { from: '2026-07-29', to: '2027-01-31' };

describe('reconcileAbsences', () => {
  const stored = [
    abs('A', 'e1', '2026-10-01', '2026-10-02'), // in the window, not returned → cancelled
    abs('B', 'e1', '2026-06-01', '2026-06-02'), // ends before the window → frozen
    abs('C', 'e2', '2026-10-05', '2026-10-06'), // e2 wasn't fetched → untouched
    abs('E', 'e1', '2026-07-20', '2026-08-03'), // overlaps the window's start, not returned → deleted
    abs('F', 'e1', '2026-09-01', null), // open-ended, not returned → deleted
    abs('G', 'e1', '2026-11-02', '2026-11-03'), // returned again → upserted
  ];
  const fetched = [abs('D', 'e1', '2026-12-01', '2026-12-02'), abs('G', 'e1', '2026-11-02', '2026-11-04')];

  it('"Stored absences for that employee that overlap the window but weren\'t returned are deleted"', () => {
    const r = reconcileAbsences(stored, fetched, ['e1'], window);
    expect(r.delete.sort()).toEqual(['A', 'E', 'F']);
    expect(r.upsert.map((a) => a.absenceId)).toEqual(['D', 'G']);
  });

  it('"Absences that end before the window are frozen", and other employees are untouched', () => {
    const r = reconcileAbsences(stored, fetched, ['e1'], window);
    expect(r.delete).not.toContain('B');
    expect(r.delete).not.toContain('C');
  });
});

describe('retentionDeletes', () => {
  it('deletes absences ending more than 13 months before today, keeps open-ended ones', () => {
    const r = retentionDeletes(
      {
        employees: [],
        history: [],
        reasons: [],
        absences: [abs('old', 'e1', '2025-09-22', '2025-09-26'), abs('edge', 'e1', '2025-09-25', '2025-09-27'), abs('open', 'e1', '2024-01-08', null)],
      },
      '2026-10-27',
    );
    expect(r.absences).toEqual(['old']);
  });

  it('deletes leavers 13 months after their end date, with their history rows, and history older than 13 months', () => {
    const r = retentionDeletes(
      {
        employees: [emp('gone', '2020-01-06', '2025-09-01'), emp('recent', '2020-01-06', '2026-02-27'), emp('stays', '2020-01-06', null)],
        history: [
          { employeeId: 'gone', month: '2025-08', department: 'Sales', jobTitle: 'Energy Analyst' },
          { employeeId: 'stays', month: '2025-08', department: 'Sales', jobTitle: 'Energy Analyst' },
          { employeeId: 'stays', month: '2025-09', department: 'Sales', jobTitle: 'Energy Analyst' },
        ],
        absences: [],
        reasons: [],
      },
      '2026-10-27',
    );
    expect(r.employees).toEqual(['gone']);
    expect(r.history.sort()).toEqual(['gone|2025-08', 'stays|2025-08']);
  });
});

describe('history rows', () => {
  it('writes one row per employee employed during the current month', () => {
    const rows = currentHistoryRows(
      [
        emp('now', '2020-01-06', null),
        emp('leftThisMonth', '2020-01-06', '2026-10-05'),
        emp('future', '2026-11-16', null),
        emp('leftLastMonth', '2020-01-06', '2026-09-30'),
      ],
      '2026-10-27',
    );
    expect(rows.map((r) => r.employeeId)).toEqual(['now', 'leftThisMonth']);
    expect(rows[0]).toEqual({ employeeId: 'now', month: '2026-10', department: 'Sales', jobTitle: 'Energy Analyst' });
  });

  it('sets historyStartDate to the first successful sync − 90 days, and never moves it', () => {
    expect(nextHistoryStartDate(null, '2026-10-27')).toBe('2026-07-29');
    expect(nextHistoryStartDate('2025-10-01', '2026-10-27')).toBe('2025-10-01');
  });
});
