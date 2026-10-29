// MockBrightHrClient (research R14, Principle VII): serves fixtures/brighthr with the real API's
// documented behaviour, so the sync runs the same way on mock and live data.
//  - pages of at most 100, re-paged with continuation tokens
//  - absences: employeeId required, `from` no more than 90 days before today (UTC), from/to
//    default to today, approved absences overlapping the range
//  - validation failures are 422 field-validation problems

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { addDays, type AbsenceDto, type EmployeeDto, type ListResponse } from '@hrd/core';
import { BrightHrError, VALIDATION_PROBLEM, type AbsenceQuery, type BrightHrClient, type EmployeeQuery } from './BrightHrClient';

const readPages = <T>(file: string): T[] =>
  (JSON.parse(readFileSync(file, 'utf8')) as ListResponse<T>[]).flatMap((p) => p.items);

function page<T>(items: T[], token: string | null | undefined, pageSize = 100): ListResponse<T> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new BrightHrError(422, VALIDATION_PROBLEM, 'BRIGHTHR_REJECTED');
  const start = token ? Number(token) : 0;
  const end = start + pageSize;
  return { items: items.slice(start, end), continuationToken: end < items.length ? String(end) : null };
}

export class MockBrightHrClient implements BrightHrClient {
  private readonly current: EmployeeDto[];
  private readonly terminated: EmployeeDto[];
  private readonly absences: AbsenceDto[];
  private readonly now: () => string;

  constructor(opts: { fixturesDir: string; now: () => string }) {
    const dir = join(opts.fixturesDir, 'brighthr');
    this.current = readPages<EmployeeDto>(join(dir, 'employees-current.json'));
    this.terminated = readPages<EmployeeDto>(join(dir, 'employees-terminated.json'));
    this.absences = readdirSync(join(dir, 'absences'))
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => readPages<AbsenceDto>(join(dir, 'absences', f)));
    this.now = opts.now;
  }

  async queryEmployees(q: EmployeeQuery): Promise<ListResponse<EmployeeDto>> {
    return page(q.isTerminated ? this.terminated : this.current, q.continuationToken, q.pageSize);
  }

  async queryAbsences(q: AbsenceQuery): Promise<ListResponse<AbsenceDto>> {
    if (!q.employeeId) throw new BrightHrError(422, VALIDATION_PROBLEM, 'BRIGHTHR_REJECTED');
    const todayUtc = this.now().slice(0, 10);
    const from = q.from ?? todayUtc;
    const to = q.to ?? todayUtc;
    if (from < addDays(todayUtc, -90)) throw new BrightHrError(422, VALIDATION_PROBLEM, 'BRIGHTHR_REJECTED');
    const items = this.absences.filter(
      (a) => a.employeeId === q.employeeId && a.start.date <= to && (a.end === null || a.end.date >= from),
    );
    return page(items, q.continuationToken, q.pageSize);
  }
}
