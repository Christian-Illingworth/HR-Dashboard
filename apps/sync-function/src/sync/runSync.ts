// One sync (research R7): lock, fetch, build, reconcile, retain, write, record the outcome.
// A failure keeps the last good data (FR-024) and records a fixed code, never personal data.

import {
  addDays,
  addMonths,
  addMonthsClamped,
  buildRecords,
  calendar,
  currentHistoryRows,
  lastDayOfMonth,
  monthOf,
  nextHistoryStartDate,
  parseSettings,
  reconcileAbsences,
  retentionDeletes,
  selectSicknessReasons,
  SettingsInvalidError,
  toLondonDate,
  type AbsenceDto,
  type EmployeeDto,
  type SyncStatus,
} from '@hrd/core';
import { BrightHrError, fetchAllPages, type BrightHrClient } from '../brighthr/BrightHrClient';
import type { DirectoryClient } from '../graph/DirectoryClient';
import type { FailureCode, Logger } from '../log';
import { PreconditionFailed, StoreError, type Store } from '../store/Store';

const LOCK_STALE_MS = 30 * 60_000;
const CONCURRENCY = 4;

export interface SyncDeps {
  brightHr: BrightHrClient;
  directory: DirectoryClient;
  store: Store;
  /** ISO instant; injected so tests fix the clock. */
  now: () => string;
  brightHrMode: 'mock' | 'live';
  log: Logger;
}

export type SyncResult =
  | { outcome: 'Succeeded'; counts: Record<string, number> }
  | { outcome: 'Failed'; code: FailureCode }
  | { outcome: 'Skipped' };

function failureCode(e: unknown): FailureCode {
  if (e instanceof BrightHrError) return e.code;
  if (e instanceof SettingsInvalidError) return 'SETTINGS_INVALID';
  if (e instanceof StoreError) return e.code;
  return 'UNKNOWN';
}

async function inPool<T, R>(items: readonly T[], size: number, work: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await work(items[i]!);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Writes the status, re-reading and merging if someone else (e.g. a refresh) wrote in between. */
async function writeStatus(store: Store, etag: string, patch: (s: SyncStatus) => SyncStatus): Promise<string> {
  let current = { status: (await store.getStatus()).status, etag };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await store.putStatus(patch(current.status), current.etag);
    } catch (e) {
      if (!(e instanceof PreconditionFailed)) throw e;
      current = await store.getStatus();
    }
  }
  throw new StoreError('GRAPH_WRITE');
}

export async function runSync(deps: SyncDeps): Promise<SyncResult> {
  const { store, log } = deps;
  const startedAt = deps.now();

  // 1. Lock: a fresh lock means a sync is already running; its result will be just as fresh.
  const { status: before, etag } = await store.getStatus();
  if (before.runningSince && Date.parse(startedAt) - Date.parse(before.runningSince) < LOCK_STALE_MS) {
    log.info('sync.skipped.locked');
    return { outcome: 'Skipped' };
  }
  let lockEtag: string;
  try {
    lockEtag = await store.putStatus(
      { ...before, runningSince: startedAt, lastAttemptStartedAt: startedAt, lastAttemptOutcome: 'Running' },
      etag,
    );
  } catch (e) {
    if (e instanceof PreconditionFailed) {
      log.info('sync.skipped.locked');
      return { outcome: 'Skipped' };
    }
    throw e;
  }
  log.info('sync.started');

  try {
    await store.checkSchema();
    const today = toLondonDate(startedAt);
    const settings = parseSettings(await store.getSettings());
    const window = { from: addDays(today, -90), to: lastDayOfMonth(addMonths(monthOf(today), 3)) };
    const retentionCutoff = addMonthsClamped(today, -13);

    // 2–3. Employees (current, and leavers still inside retention) and Entra departments.
    const current = await fetchAllPages((t) => deps.brightHr.queryEmployees({ isTerminated: false, continuationToken: t, pageSize: 100 }));
    const leavers = await fetchAllPages((t) => deps.brightHr.queryEmployees({ isTerminated: true, continuationToken: t, pageSize: 100 }));
    const employees: EmployeeDto[] = [
      ...current,
      ...leavers.filter((e) => e.employment.end !== null && e.employment.end >= retentionCutoff),
    ];
    const entraUsers = await deps.directory.listUsers();

    // 4. Absences per employee, a few at a time.
    const absenceLists = await inPool(employees, CONCURRENCY, (e) =>
      fetchAllPages((t) =>
        deps.brightHr.queryAbsences({ employeeId: e.id, from: window.from, to: window.to, continuationToken: t, pageSize: 100 }),
      ),
    );
    const absencesByEmployee: Record<string, AbsenceDto[]> = {};
    employees.forEach((e, i) => (absencesByEmployee[e.id] = absenceLists[i]!));

    // 5. Build, reconcile, apply retention, and write.
    const built = buildRecords({ employees, absencesByEmployee, entraUsers, settings, today });
    const stored = await store.readAll();
    const reconciled = reconcileAbsences(stored.absences, built.absences, employees.map((e) => e.id), window);
    const deleted = new Set(reconciled.delete);
    const merged = {
      employees: [...new Map([...stored.employees, ...built.employees].map((e) => [e.employeeId, e])).values()],
      history: [...stored.history, ...currentHistoryRows(built.employees, today)],
      absences: [...stored.absences.filter((a) => !deleted.has(a.absenceId)), ...reconciled.upsert],
      reasons: [],
    };
    const retention = retentionDeletes(merged, today);
    const keptEmployees = built.employees.filter((e) => !retention.employees.includes(e.employeeId));
    const counts = await store.applyChanges({
      employees: { upsert: keptEmployees, delete: retention.employees },
      history: {
        upsert: currentHistoryRows(keptEmployees, today),
        delete: retention.history,
      },
      absences: {
        upsert: reconciled.upsert.filter((a) => !retention.absences.includes(a.absenceId)),
        delete: [...reconciled.delete, ...retention.absences],
      },
      reasons: { replace: selectSicknessReasons(keptEmployees, built.reasonCandidates, settings, today) },
    });

    // 6. Record success.
    const finishedAt = deps.now();
    await writeStatus(store, lockEtag, (s) => ({
      ...s,
      runningSince: null,
      lastAttemptOutcome: 'Succeeded',
      lastAttemptFinishedAt: finishedAt,
      lastSuccessAt: finishedAt,
      lastFailureCode: null,
      dataMode: deps.brightHrMode === 'live' ? 'Live' : 'Sample',
      historyStartDate: nextHistoryStartDate(s.historyStartDate, today),
      warnings: { ...built.warnings, bankHolidaysEndOn: calendar.coversUntil },
    }));
    const summary = {
      employees: keptEmployees.length,
      absences: reconciled.upsert.length,
      written: counts.written,
      deleted: counts.deleted,
      unchanged: counts.unchanged,
    };
    log.info('sync.succeeded', { counts: summary });
    return { outcome: 'Succeeded', counts: summary };
  } catch (e) {
    const code = failureCode(e);
    await writeStatus(store, lockEtag, (s) => ({
      ...s,
      runningSince: null,
      lastAttemptOutcome: 'Failed',
      lastAttemptFinishedAt: deps.now(),
      lastFailureCode: code,
    }));
    log.error('sync.failed', { code });
    return { outcome: 'Failed', code };
  }
}
