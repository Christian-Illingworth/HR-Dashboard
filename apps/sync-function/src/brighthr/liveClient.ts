// LiveBrightHrClient (research R9, contracts/brighthr-consumed.md). Used only when a human sets
// BRIGHTHR_MODE=live. Every call goes through an allow-list: the token call and two read-only
// POST queries. Anything else, including the API's one write endpoint, is refused before any
// network call (constitution: BrightHR is read-only). Credentials come from Key Vault references
// via app settings and never appear in a log or error message.

import type { AbsenceDto, EmployeeDto, ListResponse } from '@hrd/core';
import { BrightHrError, type AbsenceQuery, type BrightHrClient, type EmployeeQuery } from './BrightHrClient';

const TOKEN_URL = 'https://login.brighthr.com/connect/token';
const EMPLOYEES_URL = 'https://api.bright.hr/employees/v1/query';
const ABSENCES_URL = 'https://api.bright.hr/absences/v1/query';
const ALLOWED = new Set([`POST ${TOKEN_URL}`, `POST ${EMPLOYEES_URL}`, `POST ${ABSENCES_URL}`]);
const MAX_TRIES = 5;

export interface LiveClientOptions {
  clientId: string;
  clientSecret: string;
  fetch?: typeof fetch;
  nowMs?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export class LiveBrightHrClient implements BrightHrClient {
  private token: { value: string; expiresAtMs: number } | null = null;
  private readonly fetchFn: typeof fetch;
  private readonly nowMs: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  constructor(private readonly opts: LiveClientOptions) {
    this.fetchFn = opts.fetch ?? fetch;
    this.nowMs = opts.nowMs ?? Date.now;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.random = opts.random ?? Math.random;
  }

  private send(method: string, url: string, init: RequestInit): Promise<Response> {
    if (!ALLOWED.has(`${method} ${url}`)) throw new Error('Refused: not an allowed BrightHR call');
    return this.fetchFn(url, { ...init, method });
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.nowMs() < this.token.expiresAtMs - 60_000) return this.token.value;
    const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: this.opts.clientId, client_secret: this.opts.clientSecret });
    let res: Response;
    try {
      res = await this.send('POST', TOKEN_URL, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Refused')) throw e;
      throw new BrightHrError(0, 'network', 'BRIGHTHR_UNAVAILABLE');
    }
    if (!res.ok) throw new BrightHrError(res.status, 'token', 'BRIGHTHR_AUTH');
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: json.access_token, expiresAtMs: this.nowMs() + json.expires_in * 1000 };
    return this.token.value;
  }

  /** A BrightHR call with retries. Public so the allow-list itself can be tested. */
  async request<T>(method: string, url: string, body: unknown): Promise<T> {
    if (!ALLOWED.has(`${method} ${url}`) || url === TOKEN_URL) throw new Error('Refused: not an allowed BrightHR call');
    let last: BrightHrError | null = null;
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      const token = await this.accessToken();
      let res: Response | null = null;
      try {
        res = await this.send(method, url, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });
      } catch {
        last = new BrightHrError(0, 'network', 'BRIGHTHR_UNAVAILABLE');
      }
      if (res) {
        if (res.ok) return (await res.json()) as T;
        if (res.status === 401) throw new BrightHrError(401, 'https://docs.bright.hr/problems#token-expired', 'BRIGHTHR_AUTH');
        if (res.status === 429) last = new BrightHrError(429, 'rate-limit', 'BRIGHTHR_RATE_LIMIT');
        else if (res.status >= 500) last = new BrightHrError(res.status, 'server', 'BRIGHTHR_UNAVAILABLE');
        else throw new BrightHrError(res.status, 'rejected', res.status === 403 ? 'BRIGHTHR_AUTH' : 'BRIGHTHR_REJECTED');
      }
      if (attempt < MAX_TRIES - 1) {
        const retryAfter = Number(res?.headers.get('Retry-After'));
        await this.sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * 2 ** attempt + Math.floor(this.random() * 250));
      }
    }
    throw last!;
  }

  queryEmployees(q: EmployeeQuery): Promise<ListResponse<EmployeeDto>> {
    return this.request('POST', EMPLOYEES_URL, {
      filters: { isTerminated: q.isTerminated },
      pageSize: q.pageSize ?? 100,
      continuationToken: q.continuationToken ?? null,
    });
  }

  queryAbsences(q: AbsenceQuery): Promise<ListResponse<AbsenceDto>> {
    return this.request('POST', ABSENCES_URL, {
      filters: { employeeId: q.employeeId, from: q.from, to: q.to },
      pageSize: q.pageSize ?? 100,
      continuationToken: q.continuationToken ?? null,
    });
  }
}
