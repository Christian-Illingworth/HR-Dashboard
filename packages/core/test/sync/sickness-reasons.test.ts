// R13: sickness reasons are kept only for "a sickness absence of a current Sales-department
// employee that overlaps today to today + 14 days, or is open-ended" (data-model §2.4).
import { describe, expect, it } from 'vitest';
import { selectSicknessReasons } from '../../src/sync/sicknessReasons';
import type { ReasonCandidate } from '../../src/sync/buildRecords';
import type { EmployeeRecord, Settings } from '../../src/records/types';
import { sampleInput } from '../sampleInput';
import { buildRecords } from '../../src/sync/buildRecords';

const settings: Settings = { salesDepartments: ['Sales'], absenceTypeMap: [], pregnancyRelatedReasons: [], standardDayHours: 7.5 };
const person = (employeeId: string, department: string, endDate: string | null = null): EmployeeRecord => ({
  employeeId,
  startDate: '2020-01-06',
  endDate,
  jobTitle: 'Energy Analyst',
  department,
  givenName: null,
  familyName: null,
});
const reason = (absenceId: string, employeeId: string, startDate: string, endDate: string | null): ReasonCandidate => ({
  absenceId,
  employeeId,
  reason: `reason ${absenceId}`,
  startDate,
  endDate,
});
const today = '2026-10-27';

describe('selectSicknessReasons', () => {
  const employees = [person('s', 'Sales'), person('p', 'Pricing'), person('gone', 'Sales', '2026-10-01')];

  it('keeps a Sales open-ended sickness and one overlapping today … today + 14', () => {
    const kept = selectSicknessReasons(
      employees,
      [
        reason('open', 's', '2026-10-01', null),
        reason('today', 's', '2026-10-27', '2026-10-27'),
        reason('day14', 's', '2026-11-10', '2026-11-12'),
      ],
      settings,
      today,
    );
    expect(kept.map((r) => r.absenceId)).toEqual(['open', 'today', 'day14']);
    expect(kept[0]).toEqual({ absenceId: 'open', reason: 'reason open' });
  });

  it('drops reasons that ended before today, start after day 14, or are not in Sales', () => {
    const kept = selectSicknessReasons(
      employees,
      [
        reason('ended', 's', '2026-10-20', '2026-10-26'),
        reason('day15', 's', '2026-11-11', '2026-11-11'),
        reason('pricing', 'p', '2026-10-27', null),
        reason('leaver', 'gone', '2026-09-28', null),
      ],
      settings,
      today,
    );
    expect(kept).toEqual([]);
  });

  it('keeps only "Back pain" from the fixtures', () => {
    const input = sampleInput();
    const built = buildRecords({ ...fixtureBuildInput(input), today });
    expect(selectSicknessReasons(built.employees, built.reasonCandidates, input.settings, today)).toEqual([
      { absenceId: 'a0000000-0000-4000-8000-000000000218', reason: 'Back pain' },
    ]);
  });
});

// Rebuild the raw inputs the same way sampleInput does.
import currentPages from '../../../../fixtures/brighthr/employees-current.json';
import terminatedPages from '../../../../fixtures/brighthr/employees-terminated.json';
import entraUsers from '../../../../fixtures/entra/users.json';
import type { AbsenceDto, EmployeeDto, ListResponse } from '../../src/brighthr/types';
const absenceFiles = import.meta.glob<ListResponse<AbsenceDto>[]>('../../../../fixtures/brighthr/absences/*.json', { eager: true, import: 'default' });
function fixtureBuildInput(input: ReturnType<typeof sampleInput>) {
  const absencesByEmployee: Record<string, AbsenceDto[]> = {};
  for (const pages of Object.values(absenceFiles)) for (const a of pages.flatMap((p) => p.items)) (absencesByEmployee[a.employeeId] ??= []).push(a);
  return {
    employees: [...currentPages, ...terminatedPages].flatMap((p) => p.items) as EmployeeDto[],
    absencesByEmployee,
    entraUsers,
    settings: input.settings,
  };
}
