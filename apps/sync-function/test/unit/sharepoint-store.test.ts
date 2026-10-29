// T110: SharePointStore against a fake Graph (no network), per contracts/sharepoint-lists.md.
import { describe, expect, it } from 'vitest';
import type { TokenCredential } from '@azure/identity';
import type { EmployeeRecord } from '@hrd/core';
import { SharePointStore } from '../../src/store/sharepointStore';
import { PreconditionFailed, StoreError, initialStatus } from '../../src/store/Store';
import { FakeGraph } from './fakeGraph';

const credential: TokenCredential = { getToken: async () => ({ token: 'test-token', expiresOnTimestamp: Date.now() + 3_600_000 }) };
const make = (graph: FakeGraph) => new SharePointStore({ siteId: 'site-1', credential, fetch: graph.fetch, retryDelayMs: 0 });
const emp = (id: string, over: Partial<EmployeeRecord> = {}): EmployeeRecord => ({
  employeeId: id, startDate: '2020-01-06', endDate: null, jobTitle: 'Energy Analyst', department: 'Sales', givenName: null, familyName: null, ...over,
});

describe('SharePointStore', () => {
  it('fails with STORE_SCHEMA when a column is missing, and never creates lists', async () => {
    const graph = new FakeGraph({ missingColumn: 'PregnancyRelated' });
    await expect(make(graph).checkSchema()).rejects.toMatchObject({ code: 'STORE_SCHEMA' });
    expect(graph.requests.every((r) => r.method === 'GET')).toBe(true);
    await expect(make(new FakeGraph()).checkSchema()).resolves.toBeUndefined();
  });

  it('reads every page and maps columns back to records', async () => {
    const graph = new FakeGraph();
    graph.seed('employees', { Title: 'e1', StartDate: '2020-01-06T00:00:00Z', EndDate: null, JobTitle: 'Energy Analyst', Department: 'Sales', GivenName: 'Ben', FamilyName: 'Okafor', ContentHash: 'x' });
    graph.seed('employees', { Title: 'e2', StartDate: '2021-06-01T00:00:00Z', EndDate: '2026-12-18T00:00:00Z', JobTitle: 'Energy Analyst', Department: 'Pricing', ContentHash: 'y' });
    graph.seed('employees', { Title: 'e3', StartDate: '2022-02-01T00:00:00Z', JobTitle: 'Energy Analyst', Department: 'Analysis', ContentHash: 'z' });
    graph.seed('absences', { Title: 'a1', EmployeeId: 'e1', BrightHrType: 'Sickness', DisplayName: 'Sickness', StartDate: '2026-10-22T00:00:00Z', StartPart: 'FullDay', EndDate: null, EndPart: null, DurationDays: null, DurationMinutes: 900, PregnancyRelated: true, ContentHash: 'h' });
    const all = await make(graph).readAll();
    expect(all.employees.map((e) => e.employeeId)).toEqual(['e1', 'e2', 'e3']); // 2 pages
    expect(all.employees[1]).toEqual({ employeeId: 'e2', startDate: '2021-06-01', endDate: '2026-12-18', jobTitle: 'Energy Analyst', department: 'Pricing', givenName: null, familyName: null });
    expect(all.absences[0]).toEqual({
      absenceId: 'a1', employeeId: 'e1', brightHrType: 'Sickness', displayName: 'Sickness', startDate: '2026-10-22', startPart: 'FullDay',
      endDate: null, endPart: null, durationDays: null, durationMinutes: 900, pregnancyRelated: true,
    });
    expect(graph.requests[0]!.auth).toBe('Bearer test-token');
  });

  it('writes in batches of at most 20, skips unchanged items, and deletes', async () => {
    const graph = new FakeGraph();
    const store = make(graph);
    const many = Array.from({ length: 45 }, (_, i) => emp(`e${i}`));
    expect(await store.applyChanges({ employees: { upsert: many, delete: [] } })).toEqual({ written: 45, deleted: 0, unchanged: 0 });
    expect(graph.batchCalls).toEqual([20, 20, 5]);
    graph.batchCalls = [];
    const changed = many.map((e, i) => (i === 3 ? { ...e, jobTitle: 'Senior Energy Analyst' } : e)).filter((e) => e.employeeId !== 'e10');
    expect(await store.applyChanges({ employees: { upsert: changed, delete: ['e10'] } })).toEqual({ written: 1, deleted: 1, unchanged: 43 });
    const all = await store.readAll();
    expect(all.employees).toHaveLength(44);
    expect(all.employees.find((e) => e.employeeId === 'e3')!.jobTitle).toBe('Senior Energy Analyst');
  });

  it('retries a batch request that was throttled (429)', async () => {
    const graph = new FakeGraph();
    graph.failNextBatchWith429 = 2;
    await expect(make(graph).applyChanges({ employees: { upsert: [emp('e1'), emp('e2')], delete: [] } })).resolves.toMatchObject({ written: 2 });
    expect((await make(graph).readAll()).employees).toHaveLength(2);
  });

  it('replaces sickness reasons wholesale', async () => {
    const graph = new FakeGraph();
    graph.seed('reasons', { Title: 'old', Reason: 'Cold or flu' });
    await make(graph).applyChanges({ reasons: { replace: [{ absenceId: 'a1', reason: 'Back pain' }] } });
    expect((await make(graph).readAll()).reasons).toEqual([{ absenceId: 'a1', reason: 'Back pain' }]);
  });

  it('guards the status item with its ETag (412 → PreconditionFailed)', async () => {
    const graph = new FakeGraph();
    graph.seed('status', { Title: 'status', DataMode: 'Sample', Warnings: '{"departmentNotSet":0,"skippedRecords":0}' });
    const store = make(graph);
    const { status, etag } = await store.getStatus();
    expect(status).toEqual(initialStatus);
    const next = await store.putStatus({ ...status, runningSince: '2026-10-27T10:00:00.000Z' }, etag);
    expect(next).not.toBe(etag);
    await expect(store.putStatus(status, etag)).rejects.toBeInstanceOf(PreconditionFailed);
    expect((await store.getStatus()).status.runningSince).toBe('2026-10-27T10:00:00.000Z');
  });

  it('fails with STORE_SCHEMA if the status item is missing, and reads settings', async () => {
    const graph = new FakeGraph();
    await expect(make(graph).getStatus()).rejects.toBeInstanceOf(StoreError);
    graph.seed('settings', { Title: 'SalesDepartments', Value: 'Sales\nSales Ops' });
    graph.seed('settings', { Title: 'StandardDayHours', Value: '7.5' });
    await expect(make(graph).getSettings()).resolves.toEqual({ SalesDepartments: 'Sales\nSales Ops', StandardDayHours: '7.5' });
  });
});
