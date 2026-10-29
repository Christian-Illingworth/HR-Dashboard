// T125 (quickstart Q3, constitution Principle I): the live BrightHR client, tested with a fake
// fetch only. Nothing here touches the network or BrightHR.
import { describe, expect, it, vi } from 'vitest';
import { LiveBrightHrClient } from '../../src/brighthr/liveClient';

const SECRET = 'test-secret-value-xyz';
type Call = { method: string; url: string; body: string };

function fakeFetch(handler: (call: Call, n: number) => Response | Error) {
  const calls: Call[] = [];
  const fetch = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
    const call = { method: init.method ?? 'GET', url: String(input), body: String(init.body ?? '') };
    calls.push(call);
    const r = handler(call, calls.length);
    if (r instanceof Error) throw r;
    return r;
  });
  return { fetch, calls };
}
const ok = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const token = (expiresIn = 3600) => ok({ access_token: 'tok', expires_in: expiresIn, token_type: 'Bearer' });

function client(handler: Parameters<typeof fakeFetch>[0], clock = { now: 0 }) {
  const f = fakeFetch(handler);
  const sleep = vi.fn(async (_ms: number) => undefined);
  const c = new LiveBrightHrClient({ clientId: 'id', clientSecret: SECRET, fetch: f.fetch, nowMs: () => clock.now, sleep, random: () => 0 });
  return { c, ...f, sleep };
}

describe('allow-list', () => {
  it.each([
    ['PUT', 'https://api.bright.hr/employees/v1/123/external-reference'],
    ['GET', 'https://api.bright.hr/employees/v1/query'],
    ['POST', 'https://api.bright.hr/blip/v1/clockings/query'],
    ['POST', 'https://evil.example/employees/v1/query'],
    ['DELETE', 'https://api.bright.hr/absences/v1/query'],
  ])('refuses %s %s before any network call', async (method, url) => {
    const { c, fetch } = client(() => ok({}));
    await expect(c.request(method, url, {})).rejects.toThrow(/not an allowed BrightHR call/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends only the token call and the two POST queries', async () => {
    const { c, calls } = client((call) => (call.url.includes('connect/token') ? token() : ok({ items: [], continuationToken: null })));
    await c.queryEmployees({ isTerminated: false, pageSize: 100 });
    await c.queryAbsences({ employeeId: 'e1', from: '2026-07-29', to: '2027-01-31' });
    expect(calls.map((x) => `${x.method} ${x.url}`)).toEqual([
      'POST https://login.brighthr.com/connect/token',
      'POST https://api.bright.hr/employees/v1/query',
      'POST https://api.bright.hr/absences/v1/query',
    ]);
    expect(calls[0]!.body).toBe(`grant_type=client_credentials&client_id=id&client_secret=${SECRET}`);
    expect(JSON.parse(calls[1]!.body)).toEqual({ filters: { isTerminated: false }, pageSize: 100, continuationToken: null });
    expect(JSON.parse(calls[2]!.body)).toEqual({ filters: { employeeId: 'e1', from: '2026-07-29', to: '2027-01-31' }, pageSize: 100, continuationToken: null });
  });
});

describe('token caching', () => {
  it('reuses the token until 60 seconds before it expires', async () => {
    const clock = { now: 0 };
    const { c, calls } = client((call) => (call.url.includes('connect/token') ? token(3600) : ok({ items: [] })), clock);
    await c.queryEmployees({ isTerminated: false });
    clock.now = 3_539_000; // 3539 s: still more than 60 s left
    await c.queryEmployees({ isTerminated: false });
    clock.now = 3_541_000; // within the last 60 s: fetch a new one
    await c.queryEmployees({ isTerminated: false });
    expect(calls.filter((x) => x.url.includes('connect/token'))).toHaveLength(2);
  });
});

describe('errors and retries', () => {
  it('401 → BRIGHTHR_AUTH, without the secret in the message', async () => {
    const { c } = client((call) => (call.url.includes('connect/token') ? token() : ok({}, 401)));
    const err = await c.queryEmployees({ isTerminated: false }).catch((e) => e);
    expect(err).toMatchObject({ status: 401, code: 'BRIGHTHR_AUTH' });
    expect(String(err)).not.toContain(SECRET);
  });

  it('a refused token request → BRIGHTHR_AUTH', async () => {
    const { c } = client(() => ok({ error: 'invalid_client' }, 400));
    await expect(c.queryEmployees({ isTerminated: false })).rejects.toMatchObject({ code: 'BRIGHTHR_AUTH' });
  });

  it('429 waits for Retry-After and tries again', async () => {
    const { c, sleep } = client((call, n) => (call.url.includes('connect/token') ? token() : n === 2 ? ok({}, 429, { 'Retry-After': '7' }) : ok({ items: [] })));
    await expect(c.queryEmployees({ isTerminated: false })).resolves.toEqual({ items: [] });
    expect(sleep).toHaveBeenCalledWith(7000);
  });

  it('gives up after 5 tries with BRIGHTHR_RATE_LIMIT or BRIGHTHR_UNAVAILABLE', async () => {
    const limited = client((call) => (call.url.includes('connect/token') ? token() : ok({}, 429)));
    await expect(limited.c.queryEmployees({ isTerminated: false })).rejects.toMatchObject({ code: 'BRIGHTHR_RATE_LIMIT' });
    expect(limited.calls.filter((x) => x.url.includes('employees'))).toHaveLength(5);
    const down = client((call) => (call.url.includes('connect/token') ? token() : ok({}, 503)));
    await expect(down.c.queryEmployees({ isTerminated: false })).rejects.toMatchObject({ code: 'BRIGHTHR_UNAVAILABLE' });
    const offline = client((call) => (call.url.includes('connect/token') ? token() : new TypeError('fetch failed')));
    await expect(offline.c.queryEmployees({ isTerminated: false })).rejects.toMatchObject({ code: 'BRIGHTHR_UNAVAILABLE' });
  });

  it('backs off exponentially when there is no Retry-After', async () => {
    const { c, sleep } = client((call, n) => (call.url.includes('connect/token') ? token() : n < 4 ? ok({}, 503) : ok({ items: [] })));
    await c.queryEmployees({ isTerminated: false });
    expect(sleep.mock.calls.map((x) => x[0])).toEqual([500, 1000]);
  });

  it('422 → BRIGHTHR_REJECTED, not retried', async () => {
    const { c, calls } = client((call) => (call.url.includes('connect/token') ? token() : ok({ errors: {} }, 422)));
    await expect(c.queryAbsences({ employeeId: 'e1' })).rejects.toMatchObject({ code: 'BRIGHTHR_REJECTED' });
    expect(calls.filter((x) => x.url.includes('absences'))).toHaveLength(1);
  });
});
