// T101: the Store contract, through the local file store.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileStore } from '../../src/store/fileStore';
import { PreconditionFailed } from '../../src/store/Store';
import type { AbsenceRecord, EmployeeRecord } from '@hrd/core';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hrd-store-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const emp = (id: string, over: Partial<EmployeeRecord> = {}): EmployeeRecord => ({
  employeeId: id, startDate: '2020-01-06', endDate: null, jobTitle: 'Energy Analyst', department: 'Sales', givenName: null, familyName: null, ...over,
});
const abs = (id: string): AbsenceRecord => ({
  absenceId: id, employeeId: 'e1', brightHrType: 'Holiday', displayName: 'Annual leave', startDate: '2026-10-26', startPart: 'FullDay',
  endDate: '2026-10-30', endPart: 'FullDay', durationDays: null, durationMinutes: null, pregnancyRelated: false,
});

describe('FileStore', () => {
  it('starts empty, with an initial status and default settings', async () => {
    const store = new FileStore(dir);
    await expect(store.readAll()).resolves.toEqual({ employees: [], history: [], absences: [], reasons: [] });
    const { status } = await store.getStatus();
    expect(status).toMatchObject({ lastSuccessAt: null, historyStartDate: null, dataMode: 'Sample' });
    await expect(store.getSettings()).resolves.toMatchObject({ SalesDepartments: 'Sales' });
  });

  it('upserts, skips unchanged items, and deletes', async () => {
    const store = new FileStore(dir);
    expect(await store.applyChanges({ employees: { upsert: [emp('e1'), emp('e2')], delete: [] }, absences: { upsert: [abs('a1')], delete: [] } })).toEqual({ written: 3, deleted: 0, unchanged: 0 });
    expect(await store.applyChanges({ employees: { upsert: [emp('e1'), emp('e2', { jobTitle: 'Senior Energy Analyst' })], delete: [] } })).toEqual({ written: 1, deleted: 0, unchanged: 1 });
    expect(await store.applyChanges({ employees: { upsert: [], delete: ['e1'] }, reasons: { replace: [{ absenceId: 'a1', reason: 'Back pain' }] } })).toEqual({ written: 1, deleted: 1, unchanged: 0 });
    const all = await store.readAll();
    expect(all.employees.map((e) => [e.employeeId, e.jobTitle])).toEqual([['e2', 'Senior Energy Analyst']]);
    expect(all.reasons).toEqual([{ absenceId: 'a1', reason: 'Back pain' }]);
    // Replacing reasons drops the ones not in the new list.
    await store.applyChanges({ reasons: { replace: [] } });
    expect((await store.readAll()).reasons).toEqual([]);
  });

  it('writes the status only with the current ETag', async () => {
    const store = new FileStore(dir);
    const { status, etag } = await store.getStatus();
    const next = await store.putStatus({ ...status, runningSince: '2026-10-27T10:00:00Z' }, etag);
    expect(next).not.toBe(etag);
    await expect(store.putStatus(status, etag)).rejects.toBeInstanceOf(PreconditionFailed);
    expect((await store.getStatus()).status.runningSince).toBe('2026-10-27T10:00:00Z');
  });
});
