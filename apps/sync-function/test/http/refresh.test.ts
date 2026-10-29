// T113: POST /api/refresh (research R8, FR-025): one refresh every 15 minutes across all users.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleRefresh, type RefreshDeps } from '../../src/http/refresh';
import { createLogger } from '../../src/log';
import type { FileStore } from '../../src/store/fileStore';
import { request, syncedStore, testAuth } from './helpers';

let deps: RefreshDeps;
let store: FileStore;
let sign: Awaited<ReturnType<typeof testAuth>>['sign'];
let clock: string;
const enqueue = vi.fn();

beforeEach(async () => {
  const t = await testAuth();
  sign = t.sign;
  store = await syncedStore();
  clock = '2026-10-27T10:30:00.000Z';
  enqueue.mockReset();
  deps = { auth: t.auth, store, now: () => clock, log: createLogger(() => undefined), enqueue };
});

describe('POST /api/refresh', () => {
  it('401 and 403 carry no data and queue nothing', async () => {
    expect(await handleRefresh(request(null), deps)).toMatchObject({ status: 401, jsonBody: { error: 'unauthenticated' } });
    expect(await handleRefresh(request(await sign({ roles: [] })), deps)).toMatchObject({ status: 403, jsonBody: { error: 'forbidden' } });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('queues a sync and says when the next refresh is allowed', async () => {
    const res = await handleRefresh(request(await sign()), deps);
    expect(res).toMatchObject({ status: 202, jsonBody: { status: 'queued', nextAllowedAt: '2026-10-27T10:45:00.000Z' } });
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect((await store.getStatus()).status.lastManualRefreshAt).toBe('2026-10-27T10:30:00.000Z');
  });

  it('429 with Retry-After within 15 minutes, then allowed again', async () => {
    const token = await sign();
    await handleRefresh(request(token), deps);
    clock = '2026-10-27T10:40:00.000Z';
    const again = await handleRefresh(request(token), deps);
    expect(again).toMatchObject({ status: 429, jsonBody: { nextAllowedAt: '2026-10-27T10:45:00.000Z' } });
    expect(again.headers?.['Retry-After']).toBe('300');
    clock = '2026-10-27T10:45:00.000Z';
    expect((await handleRefresh(request(token), deps)).status).toBe(202);
    expect(enqueue).toHaveBeenCalledTimes(2);
  });

  it('202 alreadyRunning while a sync holds the lock, without queueing another', async () => {
    const { status, etag } = await store.getStatus();
    await store.putStatus({ ...status, runningSince: '2026-10-27T10:25:00.000Z' }, etag);
    const res = await handleRefresh(request(await sign()), deps);
    expect(res).toMatchObject({ status: 202, jsonBody: { status: 'alreadyRunning' } });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('lets only one of two simultaneous refreshes through', async () => {
    const token = await sign();
    const results = await Promise.all([handleRefresh(request(token), deps), handleRefresh(request(token), deps)]);
    expect(results.map((r) => r.status).sort()).toEqual([202, 429]);
    expect(enqueue).toHaveBeenCalledTimes(1);
  });
});
