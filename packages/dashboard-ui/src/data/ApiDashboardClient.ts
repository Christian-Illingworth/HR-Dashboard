// The web part's client in `dataSource = api` mode (research R3): calls the Function API only,
// with the signed-in user's token. The transport is SPFx's AadHttpClient in the web part; it's
// an interface here so the mapping below is tested without SharePoint.

import type { DashboardQuery } from '@hrd/core';
import type { DashboardClient, DashboardResult, RefreshResult } from './DashboardClient';

export interface ApiTransport {
  /** Path is relative to the API base URL, e.g. "/api/dashboard?month=2026-10". Throws if no token. */
  request(method: 'GET' | 'POST', path: string): Promise<{ status: number; json(): Promise<unknown> }>;
}

/** Entra refuses a token to a user who isn't assigned to the API's app role (research R4). */
const NOT_ASSIGNED = /AADSTS50105|AADSTS501051/;

export class ApiDashboardClient implements DashboardClient {
  constructor(private readonly transport: ApiTransport) {}

  private async send(method: 'GET' | 'POST', path: string) {
    try {
      let res = await this.transport.request(method, path);
      if (res.status === 401) res = await this.transport.request(method, path); // once, with a fresh token
      return res;
    } catch (e) {
      return NOT_ASSIGNED.test(String((e as Error)?.message ?? e)) ? ('forbidden' as const) : ('unavailable' as const);
    }
  }

  async getDashboard(query: DashboardQuery): Promise<DashboardResult> {
    const params = new URLSearchParams();
    for (const key of ['month', 'department', 'role'] as const) if (query[key]) params.set(key, query[key]!);
    const qs = params.toString();
    const res = await this.send('GET', `/api/dashboard${qs ? `?${qs}` : ''}`);
    if (typeof res === 'string') return { kind: res };
    switch (res.status) {
      case 200:
        return { kind: 'ok', data: (await res.json()) as never };
      case 401:
        return { kind: 'unauthenticated' };
      case 403:
        return { kind: 'forbidden' };
      case 400:
        return { kind: 'badRequest' };
      default:
        return { kind: 'unavailable' };
    }
  }

  async requestRefresh(): Promise<RefreshResult> {
    const res = await this.send('POST', '/api/refresh');
    if (typeof res === 'string') return { kind: res };
    if (res.status === 202) {
      const body = (await res.json()) as { status: 'queued' | 'alreadyRunning'; nextAllowedAt: string };
      return { kind: body.status, nextAllowedAt: body.nextAllowedAt };
    }
    if (res.status === 429) return { kind: 'tooSoon', nextAllowedAt: ((await res.json()) as { nextAllowedAt: string }).nextAllowedAt };
    if (res.status === 401 || res.status === 403) return { kind: 'forbidden' };
    return { kind: 'unavailable' };
  }
}
