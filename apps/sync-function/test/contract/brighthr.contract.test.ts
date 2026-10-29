// T129 (constitution Principle VII): checks the mock's shape against live BrightHR responses.
//
// SKIPPED unless a human runs it deliberately, after live access is approved (go-live runbook):
//   RUN_LIVE_CONTRACT=1 BRIGHTHR_CLIENT_ID=… BRIGHTHR_CLIENT_SECRET=… npx vitest run apps/sync-function/test/contract
// Credentials come from the person's environment for that one run and are never stored. Only
// field paths and types are compared and printed, never values: live responses contain real
// employee data, which must not be logged or kept.
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { addDays, type AbsenceDto, type EmployeeDto, type ListResponse } from '@hrd/core';
import { LiveBrightHrClient } from '../../src/brighthr/liveClient';

const RUN = process.env.RUN_LIVE_CONTRACT === '1';
const fixturesDir = resolve(__dirname, '../../../../fixtures/brighthr');

/** Every field path with its JSON type, e.g. "employment.end: string|null". Values are dropped. */
function shape(value: unknown, path = '', out = new Map<string, Set<string>>()): Map<string, Set<string>> {
  const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (path) out.set(path, (out.get(path) ?? new Set()).add(type));
  if (type === 'object') for (const [k, v] of Object.entries(value as object)) shape(v, path ? `${path}.${k}` : k, out);
  if (type === 'array') for (const v of value as unknown[]) shape(v, `${path}[]`, out);
  return out;
}

/** Paths and types the mock uses that live data doesn't have: the mock must not rely on them. */
function missingFromLive(mock: Map<string, Set<string>>, live: Map<string, Set<string>>): string[] {
  const diffs: string[] = [];
  for (const [path, types] of mock) {
    const liveTypes = live.get(path);
    if (!liveTypes) diffs.push(`${path}: missing in live`);
    else for (const t of types) if (t !== 'null' && !liveTypes.has(t)) diffs.push(`${path}: mock ${t}, live ${[...liveTypes].join('|')}`);
  }
  return diffs;
}

const pages = <T>(file: string) => (JSON.parse(readFileSync(file, 'utf8')) as ListResponse<T>[]).flatMap((p) => p.items);

describe.skipIf(!RUN)('BrightHR contract (live, run by a human only)', () => {
  const client = new LiveBrightHrClient({ clientId: process.env.BRIGHTHR_CLIENT_ID ?? '', clientSecret: process.env.BRIGHTHR_CLIENT_SECRET ?? '' });

  it('employee responses have the fields and types the mock uses', async () => {
    const live = await client.queryEmployees({ isTerminated: false, pageSize: 5 });
    const mock = pages<EmployeeDto>(join(fixturesDir, 'employees-current.json'));
    const diffs = missingFromLive(shape(mock), shape(live.items));
    if (diffs.length) console.log('Employee shape differences:\n' + diffs.join('\n'));
    expect(diffs).toEqual([]);
  });

  it('absence responses have the fields and types the mock uses, per $type', async () => {
    const employees = await client.queryEmployees({ isTerminated: false, pageSize: 20 });
    const today = new Date().toISOString().slice(0, 10);
    const live: AbsenceDto[] = [];
    for (const e of employees.items) {
      live.push(...(await client.queryAbsences({ employeeId: e.id, from: addDays(today, -90), to: addDays(today, 90), pageSize: 100 })).items);
    }
    const mock = readdirSync(join(fixturesDir, 'absences')).flatMap((f) => pages<AbsenceDto>(join(fixturesDir, 'absences', f)));
    const diffs: string[] = [];
    for (const type of ['Holiday', 'Sickness', 'Toil', 'Other']) {
      const liveOfType = live.filter((a) => a.$type === type);
      if (liveOfType.length === 0) {
        console.log(`No live ${type} absences in range: not compared.`);
        continue;
      }
      diffs.push(...missingFromLive(shape(mock.filter((a) => a.$type === type)), shape(liveOfType)).map((d) => `${type} ${d}`));
    }
    if (diffs.length) console.log('Absence shape differences:\n' + diffs.join('\n'));
    expect(diffs).toEqual([]);
  });
});

describe('contract test guard', () => {
  it('is skipped unless RUN_LIVE_CONTRACT=1 is set by a person', () => {
    expect(RUN).toBe(process.env.RUN_LIVE_CONTRACT === '1');
  });
});
