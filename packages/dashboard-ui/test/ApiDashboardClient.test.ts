// T112 / T120: the API client's response and error mapping. The transport stands in for SPFx's
// AadHttpClient, which throws when it can't get a token (e.g. AADSTS50105: user not assigned).
import { describe, expect, it, vi } from 'vitest';
import { ApiDashboardClient, type ApiTransport } from '../src/data/ApiDashboardClient';

const reply = (status: number, body: unknown = {}) => ({ status, json: async () => body });

function transport(...responses: (ReturnType<typeof reply> | Error)[]): ApiTransport & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    request: vi.fn(async (method: 'GET' | 'POST', path: string) => {
      calls.push(`${method} ${path}`);
      const next = responses.shift();
      if (!next) throw new Error('no more responses');
      if (next instanceof Error) throw next;
      return next;
    }),
  };
}

describe('ApiDashboardClient.getDashboard', () => {
  it('calls /api/dashboard with the filters and returns the data', async () => {
    const t = transport(reply(200, { meta: { dataMode: 'live' } }));
    const r = await new ApiDashboardClient(t).getDashboard({ month: '2026-05', department: 'Sales & Ops', role: undefined });
    expect(t.calls).toEqual(['GET /api/dashboard?month=2026-05&department=Sales+%26+Ops']);
    expect(r).toEqual({ kind: 'ok', data: { meta: { dataMode: 'live' } } });
  });

  it.each([
    ['403', [reply(403, { error: 'forbidden' })], 'forbidden'],
    ['AADSTS50105 (user not assigned to the app role)', [new Error('AADSTS50105: The signed in user is not assigned to a role')], 'forbidden'],
    ['AADSTS501051', [new Error('AADSTS501051: Application is not assigned to a role')], 'forbidden'],
    ['400', [reply(400, { error: 'badRequest' })], 'badRequest'],
    ['503', [reply(503, { error: 'unavailable' })], 'unavailable'],
    ['a network failure', [new Error('Failed to fetch')], 'unavailable'],
    ['401 twice', [reply(401), reply(401)], 'unauthenticated'],
  ])('maps %s', async (_name, responses, kind) => {
    expect(await new ApiDashboardClient(transport(...(responses as never[]))).getDashboard({})).toEqual({ kind });
  });

  it('retries once after a 401 with a fresh token', async () => {
    const t = transport(reply(401), reply(200, { ok: true }));
    expect(await new ApiDashboardClient(t).getDashboard({})).toEqual({ kind: 'ok', data: { ok: true } });
    expect(t.calls).toHaveLength(2);
  });
});

describe('ApiDashboardClient.requestRefresh', () => {
  it.each([
    [reply(202, { status: 'queued', nextAllowedAt: 'T1' }), { kind: 'queued', nextAllowedAt: 'T1' }],
    [reply(202, { status: 'alreadyRunning', nextAllowedAt: 'T2' }), { kind: 'alreadyRunning', nextAllowedAt: 'T2' }],
    [reply(429, { nextAllowedAt: 'T3' }), { kind: 'tooSoon', nextAllowedAt: 'T3' }],
    [reply(403), { kind: 'forbidden' }],
    [reply(500), { kind: 'unavailable' }],
  ])('maps %j', async (response, expected) => {
    const t = transport(response);
    expect(await new ApiDashboardClient(t).requestRefresh()).toEqual(expected);
    expect(t.calls).toEqual(['POST /api/refresh']);
  });
});
