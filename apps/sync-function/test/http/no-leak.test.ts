// T119 (SC-004, FR-004, constitution Principle II): a refused request gets exactly the error
// body and nothing from the dataset: no names, reasons, departments or figures.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { handleDashboard, RecordsCache } from '../../src/http/dashboard';
import { handleRefresh } from '../../src/http/refresh';
import { createLogger } from '../../src/log';
import type { FileStore } from '../../src/store/fileStore';
import { contractValidator, fixturesDir, NOW, request, syncedStore, testAuth } from './helpers';

let store: FileStore;
let t: Awaited<ReturnType<typeof testAuth>>;
const log = createLogger(() => undefined);

// Every string a leak could contain: names, reasons, departments, roles, display names, IDs.
function sensitiveStrings(): string[] {
  const files = ['brighthr/employees-current.json', 'brighthr/employees-terminated.json'];
  const people = files.flatMap((f) => JSON.parse(readFileSync(join(fixturesDir, f), 'utf8')).flatMap((p: { items: unknown[] }) => p.items)) as {
    id: string;
    name: { givenName: string; familyName: string };
  }[];
  return [
    ...people.flatMap((p) => [p.name.givenName, p.name.familyName, p.id]),
    'Back pain', 'Migraine', 'Cold or flu', 'Pregnancy',
    'Sales', 'Pricing', 'Analysis', 'Operations',
    'Energy Analyst', 'Annual leave', 'headcount', 'Bradford',
  ];
}

beforeAll(async () => {
  t = await testAuth();
  store = await syncedStore();
});

describe('refused requests leak nothing', () => {
  it.each([
    ['no token', async () => null],
    ['a token without the role', async () => t.sign({ roles: [] })],
    ['a token for another audience', async () => t.sign({ aud: 'api://other' })],
  ])('%s: dashboard and refresh return only the error body', async (_name, header) => {
    const auth = await header();
    const dashboard = await handleDashboard(request(auth), { auth: t.auth, store, now: () => NOW, syncIntervalHours: 1, log, cache: new RecordsCache() });
    const enqueue = vi.fn();
    const refresh = await handleRefresh(request(auth), { auth: t.auth, store, now: () => NOW, log, enqueue });
    const validate = contractValidator('Error');
    for (const res of [dashboard, refresh]) {
      expect([401, 403]).toContain(res.status);
      expect(validate(res.jsonBody), JSON.stringify(validate.errors)).toBe(true);
      expect(Object.keys(res.jsonBody as object).sort()).toEqual(['error', 'message']);
      const text = JSON.stringify(res.jsonBody);
      for (const s of sensitiveStrings()) expect(text).not.toContain(s);
    }
    expect(enqueue).not.toHaveBeenCalled();
  });
});
