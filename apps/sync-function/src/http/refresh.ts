// POST /api/refresh (research R8, FR-025). One refresh every 15 minutes across all users: the
// time is stored in the status item and written with an ETag, so of two clicks at the same
// moment only one wins. The sync itself runs from the queue, not in this request.

import { checkRequest, type AuthOptions } from '../auth/checkRequest';
import type { Logger } from '../log';
import { PreconditionFailed, type Store } from '../store/Store';
import { ERRORS, json, type HttpRequestLike, type HttpResult } from './common';

const LIMIT_MS = 15 * 60_000;
const LOCK_STALE_MS = 30 * 60_000;

export interface RefreshDeps {
  auth: AuthOptions;
  store: Store;
  now: () => string;
  log: Logger;
  /** Puts a sync request on the queue. */
  enqueue: (message: { requestedAt: string; by: 'refresh' }) => void;
}

const iso = (ms: number) => new Date(ms).toISOString();

export async function handleRefresh(req: HttpRequestLike, deps: RefreshDeps): Promise<HttpResult> {
  const check = await checkRequest(req.headers.get('authorization'), deps.auth);
  if (check.result !== 'allowed') {
    deps.log.info('auth.rejected', { code: check.result === 'forbidden' ? 'FORBIDDEN' : 'UNAUTHENTICATED' });
    return check.result === 'forbidden' ? ERRORS.forbidden() : ERRORS.unauthenticated();
  }

  try {
    const now = deps.now();
    const nowMs = Date.parse(now);
    const tooSoon = (last: string | null) => last !== null && nowMs - Date.parse(last) < LIMIT_MS;
    const tooSoonResult = (last: string) => {
      const next = Date.parse(last) + LIMIT_MS;
      deps.log.info('refresh.tooSoon');
      return json(429, { nextAllowedAt: iso(next) }, { 'Retry-After': String(Math.ceil((next - nowMs) / 1000)) });
    };

    const { status, etag } = await deps.store.getStatus();
    if (tooSoon(status.lastManualRefreshAt)) return tooSoonResult(status.lastManualRefreshAt!);
    if (status.runningSince && nowMs - Date.parse(status.runningSince) < LOCK_STALE_MS) {
      deps.log.info('refresh.alreadyRunning');
      return json(202, { status: 'alreadyRunning', nextAllowedAt: now });
    }

    try {
      await deps.store.putStatus({ ...status, lastManualRefreshAt: now }, etag);
    } catch (e) {
      if (!(e instanceof PreconditionFailed)) throw e;
      // Someone else wrote first; if it was another refresh, this one is too soon.
      const latest = (await deps.store.getStatus()).status;
      if (tooSoon(latest.lastManualRefreshAt)) return tooSoonResult(latest.lastManualRefreshAt!);
      return ERRORS.unavailable();
    }
    deps.enqueue({ requestedAt: now, by: 'refresh' });
    deps.log.info('refresh.queued');
    return json(202, { status: 'queued', nextAllowedAt: iso(nowMs + LIMIT_MS) });
  } catch {
    deps.log.error('dashboard.unavailable', { code: 'UNKNOWN' });
    return ERRORS.unavailable();
  }
}
