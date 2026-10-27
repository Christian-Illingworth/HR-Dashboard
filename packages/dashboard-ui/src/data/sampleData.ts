// The synthetic mock data, as BrightHR-shaped fixtures plus the history and sync status a long-
// running sync would have built. Imported only through dynamic import() by
// SampleDashboardClient, so it is a separate chunk (research R14, tasks T092).

import type { AbsenceDto, EmployeeDto, EmployeeHistoryRow, ListResponse, SyncStatus } from '@hrd/core';
import currentPages from '../../../../fixtures/brighthr/employees-current.json';
import terminatedPages from '../../../../fixtures/brighthr/employees-terminated.json';
import entraUsers from '../../../../fixtures/entra/users.json';
import rawSettings from '../../../../fixtures/settings.json';
import sampleStatus from '../../../../fixtures/sample-sync-status.json';
import sampleHistory from '../../../../fixtures/sample-history.json';

const absenceFiles = import.meta.glob<ListResponse<AbsenceDto>[]>('../../../../fixtures/brighthr/absences/*.json', {
  eager: true,
  import: 'default',
});

export const employees = [...currentPages, ...terminatedPages].flatMap((p) => p.items) as EmployeeDto[];

export const absencesByEmployee: Record<string, AbsenceDto[]> = {};
for (const pages of Object.values(absenceFiles)) {
  for (const a of pages.flatMap((p) => p.items)) (absencesByEmployee[a.employeeId] ??= []).push(a);
}

export { entraUsers, rawSettings };
export const status = sampleStatus as SyncStatus;
export const history = sampleHistory as EmployeeHistoryRow[];
