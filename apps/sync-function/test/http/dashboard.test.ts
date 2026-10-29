// T108: GET /api/dashboard. Auth first; 401/403 carry no dashboard data (FR-004, SC-004);
// every 200 body matches the OpenAPI contract.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { DashboardResponse } from '@hrd/core';
import { handleDashboard, RecordsCache, type DashboardDeps } from '../../src/http/dashboard';
import { createLogger } from '../../src/log';
import type { FileStore } from '../../src/store/fileStore';
import { contractValidator, NOW, request, syncedStore, testAuth } from './helpers';

let deps: DashboardDeps;
let sign: Awaited<ReturnType<typeof testAuth>>['sign'];
let store: FileStore;

beforeAll(async () => {
  const t = await testAuth();
  sign = t.sign;
  store = await syncedStore();
  deps = { auth: t.auth, store, now: () => NOW, syncIntervalHours: 1, log: createLogger(() => undefined), cache: new RecordsCache() };
});

describe('GET /api/dashboard', () => {
  it('401 with no data for a missing or bad token', async () => {
    for (const header of [null, 'Bearer nope']) {
      const res = await handleDashboard(request(header), deps);
      expect(res.status).toBe(401);
      expect(res.jsonBody).toEqual({ error: 'unauthenticated', message: 'Sign in to see the HR Dashboard.' });
    }
  });

  it('403 with no data for a user outside the access group', async () => {
    const res = await handleDashboard(request(await sign({ roles: [] })), deps);
    expect(res.status).toBe(403);
    expect(res.jsonBody).toEqual({ error: 'forbidden', message: "You don't have access to the HR Dashboard." });
  });

  it('200 with a body that matches the contract', async () => {
    const res = await handleDashboard(request(await sign()), deps);
    expect(res.status).toBe(200);
    expect(res.headers?.['Cache-Control']).toBe('no-store');
    const validate = contractValidator('DashboardResponse');
    expect(validate(res.jsonBody), JSON.stringify(validate.errors)).toBe(true);
  });

  it('serves the synced mock data, just after launch (kpis.md: launch scenario)', async () => {
    const body = (await handleDashboard(request(await sign()), deps)).jsonBody as DashboardResponse;
    expect(body.meta).toMatchObject({ dataMode: 'sample', today: '2026-10-27' });
    expect(body.sections.kpis.data).toMatchObject({ headcount: 14, onLeaveToday: 2, offSickToday: 2 });
    expect(body.sections.kpis.data!.bradfordAverage).toMatchObject({ value: 1, basisStartDate: '2026-07-29', basisIsPartial: true });
    expect(body.sections.sickness.data).toMatchObject({ notEnoughHistory: true });
    expect(body.coverage.historyStartDate).toBe('2026-07-29');
  });

  it('applies the filters from the query string, and 400s an option that is not offered', async () => {
    const token = await sign();
    const sales = (await handleDashboard(request(token, { department: 'Sales' }), deps)).jsonBody as DashboardResponse;
    expect(sales.sections.kpis.data!.headcount).toBe(4);
    const bad = await handleDashboard(request(token, { month: '2025-12' }), deps);
    expect(bad).toMatchObject({ status: 400, jsonBody: { error: 'badRequest' } });
  });

  it('loads the records once per sync, then serves from memory', async () => {
    const spy = vi.spyOn(store, 'readAll');
    const cached = { ...deps, cache: new RecordsCache() };
    const token = await sign();
    await handleDashboard(request(token), cached);
    await handleDashboard(request(token), cached);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('503 when the stored data cannot be read', async () => {
    const broken = { ...deps, cache: new RecordsCache(), store: { ...store, getStatus: async () => Promise.reject(new Error('down')) } as unknown as FileStore };
    const res = await handleDashboard(request(await sign()), broken);
    expect(res).toMatchObject({ status: 503, jsonBody: { error: 'unavailable' } });
    expect(JSON.stringify(res.jsonBody)).not.toContain('down');
  });
});
