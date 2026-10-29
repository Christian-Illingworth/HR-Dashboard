// GET /api/dashboard (contracts/dashboard-api.openapi.yaml). Auth first, then the figures for
// the requested filters, worked out in memory from the stored records (research R15).

import {
  BadRequestError,
  buildDashboard,
  parseSettings,
  toLondonDate,
  type DashboardRecords,
  type DashboardQuery,
} from '@hrd/core';
import { checkRequest, type AuthOptions } from '../auth/checkRequest';
import type { Logger } from '../log';
import type { Store } from '../store/Store';
import { ERRORS, json, type HttpRequestLike, type HttpResult } from './common';

/** Keeps the stored records in memory until the next successful sync changes lastSuccessAt. */
export class RecordsCache {
  private key: string | null | undefined = undefined;
  private records: DashboardRecords | null = null;

  async get(key: string | null, load: () => Promise<DashboardRecords>): Promise<DashboardRecords> {
    if (this.records && this.key === key) return this.records;
    const records = await load();
    this.key = key;
    this.records = records;
    return records;
  }
}

export interface DashboardDeps {
  auth: AuthOptions;
  store: Store;
  now: () => string;
  syncIntervalHours: 1 | 2;
  log: Logger;
  cache: RecordsCache;
}

export async function handleDashboard(req: HttpRequestLike, deps: DashboardDeps): Promise<HttpResult> {
  const check = await checkRequest(req.headers.get('authorization'), deps.auth);
  if (check.result !== 'allowed') {
    deps.log.info('auth.rejected', { code: check.result === 'forbidden' ? 'FORBIDDEN' : 'UNAUTHENTICATED' });
    return check.result === 'forbidden' ? ERRORS.forbidden() : ERRORS.unauthenticated();
  }

  const query: DashboardQuery = {};
  for (const key of ['month', 'department', 'role'] as const) {
    const value = req.query.get(key);
    if (value) query[key] = value;
  }

  try {
    const now = deps.now();
    const { status } = await deps.store.getStatus();
    const records = await deps.cache.get(status.lastSuccessAt, () => deps.store.readAll());
    const settings = parseSettings(await deps.store.getSettings());
    const body = buildDashboard({ records, status, settings, query, today: toLondonDate(now), now, syncIntervalHours: deps.syncIntervalHours });
    deps.log.info('dashboard.served');
    return json(200, body);
  } catch (e) {
    if (e instanceof BadRequestError) {
      deps.log.info('dashboard.badRequest');
      return ERRORS.badRequest();
    }
    deps.log.error('dashboard.unavailable', { code: 'UNKNOWN' });
    return ERRORS.unavailable();
  }
}
