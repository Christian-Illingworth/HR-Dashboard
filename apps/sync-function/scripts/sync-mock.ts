// npm run sync:mock [-- --seed-history]   (tasks T109, quickstart Q4)
// Runs one sync with mock BrightHR and mock Entra into the file store (LOCAL_DATA_DIR, default
// .local-data/). Prints counts only. With --seed-history it first seeds a year of synthetic
// history (as if the sync had been running since 2025-10-01), so the local API shows full charts.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  addDays,
  buildRecords,
  parseSettings,
  selectSicknessReasons,
  toLondonDate,
  type AbsenceDto,
  type EmployeeDto,
  type EmployeeHistoryRow,
  type ListResponse,
} from '@hrd/core';
import { loadConfig } from '../src/config';
import { MockBrightHrClient } from '../src/brighthr/mockClient';
import { MockDirectoryClient } from '../src/graph/mockDirectory';
import { createLogger } from '../src/log';
import { FileStore } from '../src/store/fileStore';
import { initialStatus } from '../src/store/Store';
import { runSync } from '../src/sync/runSync';

const config = loadConfig({ ...process.env, STORE_MODE: 'file', BRIGHTHR_MODE: 'mock' });
const now = () => process.env.MOCK_NOW ?? new Date().toISOString();
const store = new FileStore(config.localDataDir);
const fixtures = config.fixturesDir;
const pages = <T>(file: string) => (JSON.parse(readFileSync(file, 'utf8')) as ListResponse<T>[]).flatMap((p) => p.items);
const rawSettings = JSON.parse(readFileSync(join(fixtures, 'settings.json'), 'utf8'));
store.writeSettings(rawSettings);

if (process.argv.includes('--seed-history')) {
  const today = toLondonDate(now());
  const settings = parseSettings(rawSettings);
  const employees = [
    ...pages<EmployeeDto>(join(fixtures, 'brighthr', 'employees-current.json')),
    ...pages<EmployeeDto>(join(fixtures, 'brighthr', 'employees-terminated.json')),
  ];
  const absencesByEmployee: Record<string, AbsenceDto[]> = {};
  for (const f of readdirSync(join(fixtures, 'brighthr', 'absences'))) {
    for (const a of pages<AbsenceDto>(join(fixtures, 'brighthr', 'absences', f))) (absencesByEmployee[a.employeeId] ??= []).push(a);
  }
  const entraUsers = JSON.parse(readFileSync(join(fixtures, 'entra', 'users.json'), 'utf8'));
  const built = buildRecords({ employees, absencesByEmployee, entraUsers, settings, today });
  const history = JSON.parse(readFileSync(join(fixtures, 'sample-history.json'), 'utf8')) as EmployeeHistoryRow[];
  await store.applyChanges({
    employees: { upsert: built.employees, delete: [] },
    history: { upsert: history, delete: [] },
    absences: { upsert: built.absences, delete: [] },
    reasons: { replace: selectSicknessReasons(built.employees, built.reasonCandidates, settings, today) },
  });
  const { etag } = await store.getStatus();
  await store.putStatus({ ...initialStatus, historyStartDate: addDays('2025-10-01', 0), lastSuccessAt: now(), lastAttemptOutcome: 'Succeeded' }, etag);
  console.log(`Seeded a year of synthetic history: ${built.employees.length} employees, ${built.absences.length} absences, ${history.length} history rows.`);
}

const result = await runSync({
  brightHr: new MockBrightHrClient({ fixturesDir: fixtures, now }),
  directory: new MockDirectoryClient({ fixturesDir: fixtures }),
  store,
  now,
  brightHrMode: 'mock',
  log: createLogger(),
});
const { status } = await store.getStatus();
console.log(`Sync ${result.outcome}. DataMode: ${status.dataMode}. History from ${status.historyStartDate}. Data in ${config.localDataDir}.`);
if (result.outcome === 'Failed') process.exit(1);
