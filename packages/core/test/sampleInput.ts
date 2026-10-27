// Builds a buildDashboard input from the synthetic fixtures, as the mock-data mode does.
// Today is fixed at 2026-10-27 and now at 10:30 UK time (GMT).
import { buildRecords } from '../src/sync/buildRecords';
import { parseSettings } from '../src/records/settings';
import { selectSicknessReasons } from '../src/sync/sicknessReasons';
import type { BuildDashboardInput } from '../src/dashboard/buildDashboard';
import type { AbsenceDto, EmployeeDto, ListResponse } from '../src/brighthr/types';
import type { EmployeeHistoryRow, SyncStatus } from '../src/records/types';
import currentPages from '../../../fixtures/brighthr/employees-current.json';
import terminatedPages from '../../../fixtures/brighthr/employees-terminated.json';
import entraUsers from '../../../fixtures/entra/users.json';
import rawSettings from '../../../fixtures/settings.json';
import sampleStatus from '../../../fixtures/sample-sync-status.json';
import sampleHistory from '../../../fixtures/sample-history.json';

const absenceFiles = import.meta.glob<ListResponse<AbsenceDto>[]>('../../../fixtures/brighthr/absences/*.json', {
  eager: true,
  import: 'default',
});

export const TODAY = '2026-10-27';
export const NOW = '2026-10-27T10:30:00.000Z';

export function sampleInput(over: Partial<BuildDashboardInput> & { rawSettings?: Record<string, string> } = {}): BuildDashboardInput {
  const settings = parseSettings(over.rawSettings ?? rawSettings);
  const employees = [...currentPages, ...terminatedPages].flatMap((p) => p.items) as EmployeeDto[];
  const absencesByEmployee: Record<string, AbsenceDto[]> = {};
  for (const pages of Object.values(absenceFiles)) {
    for (const a of pages.flatMap((p) => p.items)) (absencesByEmployee[a.employeeId] ??= []).push(a);
  }
  const built = buildRecords({ employees, absencesByEmployee, entraUsers, settings, today: TODAY });
  const { rawSettings: _ignored, ...rest } = over;
  return {
    records: {
      employees: built.employees,
      absences: built.absences,
      history: sampleHistory as EmployeeHistoryRow[],
      reasons: selectSicknessReasons(built.employees, built.reasonCandidates, settings, TODAY),
    },
    status: sampleStatus as SyncStatus,
    settings,
    query: {},
    today: TODAY,
    now: NOW,
    syncIntervalHours: 1,
    ...rest,
  };
}
