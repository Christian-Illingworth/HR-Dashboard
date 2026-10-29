// T104: one sync, end to end, on mock BrightHR + mock Entra + the file store (research R7, R11).
// Today 2026-10-27; window 2026-07-29 (today − 90) to 2027-01-31 (end of the month 3 ahead).
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AbsenceDto, ListResponse } from '@hrd/core';
import { runSync, type SyncDeps } from '../../src/sync/runSync';
import { MockBrightHrClient } from '../../src/brighthr/mockClient';
import { BrightHrError, type AbsenceQuery, type BrightHrClient } from '../../src/brighthr/BrightHrClient';
import { MockDirectoryClient } from '../../src/graph/mockDirectory';
import { FileStore } from '../../src/store/fileStore';
import { createLogger } from '../../src/log';
import rawSettings from '../../../../fixtures/settings.json';

const fixturesDir = resolve(__dirname, '../../../../fixtures');
const NOW = '2026-10-27T10:00:00.000Z';
let dir: string;
let store: FileStore;
let logLines: string[];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hrd-sync-'));
  store = new FileStore(dir);
  store.writeSettings(rawSettings);
  logLines = [];
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function deps(over: Partial<SyncDeps> = {}, now = NOW): SyncDeps {
  return {
    brightHr: new MockBrightHrClient({ fixturesDir, now: () => now }),
    directory: new MockDirectoryClient({ fixturesDir }),
    store,
    now: () => now,
    brightHrMode: 'mock',
    log: createLogger((l) => logLines.push(l)),
    ...over,
  };
}

describe('runSync', () => {
  it('syncs the mock data: kept employees, the 90-day window of absences, history and reasons', async () => {
    const result = await runSync(deps());
    expect(result.outcome).toBe('Succeeded');
    const data = await store.readAll();
    expect(data.employees).toHaveLength(19);
    expect(data.absences).toHaveLength(22);
    expect(data.history).toHaveLength(14);
    expect(data.history.every((h) => h.month === '2026-10')).toBe(true);
    expect(data.reasons).toEqual([{ absenceId: 'a0000000-0000-4000-8000-000000000218', reason: 'Back pain' }]);
    const { status } = await store.getStatus();
    expect(status).toMatchObject({
      lastAttemptOutcome: 'Succeeded',
      lastSuccessAt: NOW,
      lastFailureCode: null,
      runningSince: null,
      dataMode: 'Sample',
      historyStartDate: '2026-07-29',
      warnings: { departmentNotSet: 2, skippedRecords: 0, bankHolidaysEndOn: '2028-12-26' },
    });
  });

  it('never writes note text or email addresses to the store', async () => {
    await runSync(deps());
    const onDisk = readdirSync(dir).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
    for (const banned of ['Physio booked', 'Fit note', 'consultiv.example', '"note"']) expect(onDisk).not.toContain(banned);
  });

  it('logs counts only', async () => {
    await runSync(deps());
    expect(logLines.join('\n')).not.toMatch(/Patel|Back pain|consultiv/);
    expect(JSON.parse(logLines.at(-1)!)).toMatchObject({ event: 'sync.succeeded' });
  });

  it('skips while a fresh lock is held, and takes over a stale one', async () => {
    const { status, etag } = await store.getStatus();
    const lockEtag = await store.putStatus({ ...status, runningSince: '2026-10-27T09:50:00.000Z' }, etag);
    expect((await runSync(deps())).outcome).toBe('Skipped');
    expect((await store.readAll()).employees).toHaveLength(0);
    await store.putStatus({ ...status, runningSince: '2026-10-27T09:20:00.000Z' }, lockEtag); // 40 minutes old
    expect((await runSync(deps())).outcome).toBe('Succeeded');
  });

  it('keeps the last good data and records a fixed code when BrightHR fails', async () => {
    await runSync(deps());
    const before = await store.readAll();
    const failing: BrightHrClient = {
      queryEmployees: async () => {
        throw new BrightHrError(429, 'https://docs.bright.hr/problems#rate-limit', 'BRIGHTHR_RATE_LIMIT');
      },
      queryAbsences: async () => ({ items: [] }),
    };
    const result = await runSync(deps({ brightHr: failing, now: () => '2026-10-27T11:00:00.000Z' }));
    expect(result).toMatchObject({ outcome: 'Failed', code: 'BRIGHTHR_RATE_LIMIT' });
    expect(await store.readAll()).toEqual(before);
    const { status } = await store.getStatus();
    expect(status).toMatchObject({ lastAttemptOutcome: 'Failed', lastFailureCode: 'BRIGHTHR_RATE_LIMIT', lastSuccessAt: NOW, runningSince: null });
  });

  it('deletes an absence that was cancelled in BrightHR, at the next sync', async () => {
    await runSync(deps());
    const L06 = 'a0000000-0000-4000-8000-000000000106';
    const mock = new MockBrightHrClient({ fixturesDir, now: () => NOW });
    const cancelling: BrightHrClient = {
      queryEmployees: (q) => mock.queryEmployees(q),
      queryAbsences: async (q: AbsenceQuery): Promise<ListResponse<AbsenceDto>> => {
        const r = await mock.queryAbsences(q);
        return { ...r, items: r.items.filter((a) => a.id !== L06) };
      },
    };
    await runSync(deps({ brightHr: cancelling }));
    expect((await store.readAll()).absences.map((a) => a.absenceId)).not.toContain(L06);
  });

  it('fails with SETTINGS_INVALID on bad settings, and keeps historyStartDate once set', async () => {
    await runSync(deps());
    await runSync(deps({}, '2026-11-03T10:00:00.000Z'));
    expect((await store.getStatus()).status.historyStartDate).toBe('2026-07-29');
    store.writeSettings({ StandardDayHours: 'seven' });
    expect(await runSync(deps())).toMatchObject({ outcome: 'Failed', code: 'SETTINGS_INVALID' });
  });
});
