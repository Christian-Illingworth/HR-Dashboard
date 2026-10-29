// T114: freshness through the API (M16, FR-024): a failed sync shows "latest update failed"
// with the previous data still there, and the 2-hourly fallback moves the threshold to 3 hours.
import { describe, expect, it } from 'vitest';
import type { DashboardResponse } from '@hrd/core';
import { handleDashboard, RecordsCache } from '../../src/http/dashboard';
import { runSync } from '../../src/sync/runSync';
import { BrightHrError, type BrightHrClient } from '../../src/brighthr/BrightHrClient';
import { MockDirectoryClient } from '../../src/graph/mockDirectory';
import { createLogger } from '../../src/log';
import { fixturesDir, request, syncedStore, testAuth } from './helpers';

const silent = createLogger(() => undefined);

describe('freshness through GET /api/dashboard', () => {
  it('shows lastAttemptFailed and keeps the previous figures after a failed sync', async () => {
    const { auth, sign } = await testAuth();
    const store = await syncedStore('2026-10-27T09:00:00.000Z');
    const failing: BrightHrClient = {
      queryEmployees: async () => Promise.reject(new BrightHrError(503, 'x', 'BRIGHTHR_UNAVAILABLE')),
      queryAbsences: async () => ({ items: [] }),
    };
    await runSync({ brightHr: failing, directory: new MockDirectoryClient({ fixturesDir }), store, now: () => '2026-10-27T10:00:00.000Z', brightHrMode: 'mock', log: silent });
    const body = (await handleDashboard(request(await sign()), { auth, store, now: () => '2026-10-27T10:30:00.000Z', syncIntervalHours: 1, log: silent, cache: new RecordsCache() })).jsonBody as DashboardResponse;
    expect(body.freshness).toMatchObject({ isStale: true, staleReason: 'lastAttemptFailed', lastAttemptOutcome: 'Failed', lastSuccessAt: '2026-10-27T09:00:00.000Z' });
    expect(body.sections.kpis.data!.headcount).toBe(14);
  });

  it('uses a 3-hour threshold on the 2-hourly fallback', async () => {
    const { auth, sign } = await testAuth();
    const store = await syncedStore('2026-10-27T08:00:00.000Z');
    const at = async (syncIntervalHours: 1 | 2) =>
      ((await handleDashboard(request(await sign()), { auth, store, now: () => '2026-10-27T10:30:00.000Z', syncIntervalHours, log: silent, cache: new RecordsCache() })).jsonBody as DashboardResponse).freshness;
    expect(await at(1)).toMatchObject({ isStale: true, staleReason: 'olderThanThreshold' }); // 2 h 30 > 2 h
    expect(await at(2)).toMatchObject({ isStale: false, staleReason: null }); // 2 h 30 ≤ 3 h
  });
});
