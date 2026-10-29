// The BrightHR calls the sync needs (contracts/brighthr-consumed.md). Two implementations:
// MockBrightHrClient (fixtures; the default) and LiveBrightHrClient (Milestone 3, allow-listed).

import type { AbsenceDto, EmployeeDto, ListResponse } from '@hrd/core';
import type { FailureCode } from '../log';

export interface EmployeeQuery {
  isTerminated: boolean;
  continuationToken?: string | null;
  pageSize?: number;
}

export interface AbsenceQuery {
  employeeId?: string;
  from?: string;
  to?: string;
  continuationToken?: string | null;
  pageSize?: number;
}

export interface BrightHrClient {
  queryEmployees(q: EmployeeQuery): Promise<ListResponse<EmployeeDto>>;
  queryAbsences(q: AbsenceQuery): Promise<ListResponse<AbsenceDto>>;
}

/** A BrightHR problem response. The message never includes response bodies or personal data. */
export class BrightHrError extends Error {
  constructor(
    readonly status: number,
    readonly problemType: string,
    readonly code: FailureCode,
  ) {
    super(`BrightHR returned ${status}`);
    this.name = 'BrightHrError';
  }
}

export const VALIDATION_PROBLEM = 'https://docs.bright.hr/problems#field-validation';

/** Follows continuation tokens until the last page. */
export async function fetchAllPages<T>(page: (token: string | null) => Promise<ListResponse<T>>): Promise<T[]> {
  const items: T[] = [];
  let token: string | null = null;
  for (let guard = 0; guard < 10_000; guard++) {
    const res = await page(token);
    items.push(...res.items);
    token = res.continuationToken ?? null;
    if (!token) return items;
  }
  throw new Error('Too many pages');
}
