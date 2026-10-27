// Normaliser and records builder against the synthetic fixtures (data-model §1 and §2).
import { describe, expect, it } from 'vitest';
import { buildRecords } from '../src/sync/buildRecords';
import { parseSettings } from '../src/records/settings';
import type { AbsenceDto, EmployeeDto, ListResponse } from '../src/brighthr/types';
import currentPages from '../../../fixtures/brighthr/employees-current.json';
import terminatedPages from '../../../fixtures/brighthr/employees-terminated.json';
import entraUsers from '../../../fixtures/entra/users.json';
import rawSettings from '../../../fixtures/settings.json';

const absenceFiles = import.meta.glob<ListResponse<AbsenceDto>[]>('../../../fixtures/brighthr/absences/*.json', {
  eager: true,
  import: 'default',
});

const employees = [...currentPages, ...terminatedPages].flatMap((p) => p.items) as EmployeeDto[];
const absencesByEmployee: Record<string, AbsenceDto[]> = {};
for (const pages of Object.values(absenceFiles)) {
  for (const a of pages.flatMap((p) => p.items)) (absencesByEmployee[a.employeeId] ??= []).push(a);
}
const settings = parseSettings(rawSettings);
const id = (n: number) => `e0000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const T = (n: number) => `e0000000-0000-4000-8000-000000000${100 + n}`;

const built = buildRecords({ employees, absencesByEmployee, entraUsers, settings, today: '2026-10-27' });
const emp = (employeeId: string) => built.employees.find((e) => e.employeeId === employeeId)!;

describe('records builder: what is kept', () => {
  it('keeps every employee and absence from the fixtures', () => {
    expect(built.employees).toHaveLength(19);
    expect(built.absences).toHaveLength(40);
    expect(built.warnings.skippedRecords).toBe(0);
  });

  it('never outputs fields outside the allow-list', () => {
    const json = JSON.stringify({ employees: built.employees, absences: built.absences });
    for (const banned of ['consultiv.example', 'Physio booked', 'Saw the GP', 'note', 'isCertified', 'estimatedReturn', 'isPaid', 'paidDuration', 'payrollNumber', 'externalReference', 'email', 'Back pain']) {
      expect(json).not.toContain(banned);
    }
  });

  it('keeps names only for Sales-department employees', () => {
    expect(emp(id(1))).toMatchObject({ givenName: 'Amelia', familyName: 'Hart', department: 'Sales' });
    expect(emp(id(5))).toMatchObject({ givenName: null, familyName: null, department: 'Pricing' });
  });

  it('matches Entra users on mail or userPrincipalName, ignoring case', () => {
    expect(emp(id(2)).department).toBe('Sales'); // mail in mixed case
    expect(emp(id(10)).department).toBe('Operations'); // no mail, matched on UPN
  });

  it('sets "Not set" for no match or a blank department, and counts current ones only', () => {
    expect(emp(id(13)).department).toBe('Not set'); // no Entra user
    expect(emp(id(14)).department).toBe('Not set'); // blank department
    expect(emp(T(1)).department).toBe('Not set'); // leaver with no Entra user
    expect(built.warnings.departmentNotSet).toBe(2);
  });

  it('turns boundaries into date + part, and keeps sickness durations', () => {
    const byId = (n: number) => built.absences.find((a) => a.absenceId === `a0000000-0000-4000-8000-000000000${n}`)!;
    expect(byId(301)).toMatchObject({ startDate: '2026-09-10', startPart: 'Time', endDate: '2026-09-10', endPart: 'Time' });
    expect(byId(110)).toMatchObject({ startPart: 'SecondHalf', endPart: 'FirstHalf' });
    expect(byId(218)).toMatchObject({ endDate: null, endPart: null, durationDays: null, durationMinutes: null });
    expect(byId(203)).toMatchObject({ durationDays: null, durationMinutes: 900 });
    expect(byId(215)).toMatchObject({ durationDays: 2, durationMinutes: null });
    expect(byId(305)).toMatchObject({ brightHrType: 'Study', displayName: 'Study leave' });
  });

  it('flags pregnancy-related sickness from the settings list', () => {
    expect(built.absences.filter((a) => a.pregnancyRelated).map((a) => a.absenceId)).toEqual([
      'a0000000-0000-4000-8000-000000000211',
    ]);
  });

  it('passes sickness reasons on separately, never inside the absence records', () => {
    const chloe = built.reasonCandidates.find((r) => r.absenceId === 'a0000000-0000-4000-8000-000000000218');
    expect(chloe).toMatchObject({ employeeId: id(3), reason: 'Back pain', startDate: '2026-10-22', endDate: null });
  });
});

describe('records builder: validation', () => {
  const base = employees[0]!;
  it('skips an absence whose end is before its start, and counts it', () => {
    const bad: AbsenceDto = {
      $type: 'Holiday', id: 'bad', employeeId: base.id, displayName: 'Annual leave',
      start: { $type: 'LocalDate', date: '2026-05-10' }, end: { $type: 'LocalDate', date: '2026-05-08' },
    };
    const out = buildRecords({ employees: [base], absencesByEmployee: { [base.id]: [bad] }, entraUsers, settings, today: '2026-10-27' });
    expect(out.absences).toHaveLength(0);
    expect(out.warnings.skippedRecords).toBe(1);
  });

  it('skips an employee with no start date, and counts it', () => {
    const noStart: EmployeeDto = { ...base, id: 'nostart', employment: { ...base.employment, start: null } };
    const out = buildRecords({ employees: [noStart], absencesByEmployee: {}, entraUsers, settings, today: '2026-10-27' });
    expect(out.employees).toHaveLength(0);
    expect(out.warnings.skippedRecords).toBe(1);
  });

  it('sets a blank job title to "Not set"', () => {
    const noTitle: EmployeeDto = { ...base, employment: { ...base.employment, jobTitle: '  ' } };
    const out = buildRecords({ employees: [noTitle], absencesByEmployee: {}, entraUsers, settings, today: '2026-10-27' });
    expect(out.employees[0]!.jobTitle).toBe('Not set');
  });
});
