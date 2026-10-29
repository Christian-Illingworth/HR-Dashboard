// T127: Entra users through Graph (User.Read.All), with a fake fetch.
import { describe, expect, it, vi } from 'vitest';
import type { TokenCredential } from '@azure/identity';
import { GraphDirectoryClient } from '../../src/graph/graphDirectory';

const credential: TokenCredential = { getToken: async () => ({ token: 'graph-token', expiresOnTimestamp: Date.now() + 3_600_000 }) };

describe('GraphDirectoryClient', () => {
  it('reads every page of users with only mail, userPrincipalName and department', async () => {
    const urls: string[] = [];
    const fetch = vi.fn(async (input: string | URL | Request, init: RequestInit = {}) => {
      urls.push(String(input));
      expect(new Headers(init.headers).get('authorization')).toBe('Bearer graph-token');
      return String(input).includes('page2')
        ? new Response(JSON.stringify({ value: [{ mail: null, userPrincipalName: 'b@x.example', department: 'Pricing' }] }))
        : new Response(JSON.stringify({ value: [{ mail: 'a@x.example', userPrincipalName: 'a@x.example', department: 'Sales' }], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/users?page2' }));
    });
    const users = await new GraphDirectoryClient({ credential, fetch }).listUsers();
    expect(urls[0]).toBe('https://graph.microsoft.com/v1.0/users?$select=mail,userPrincipalName,department&$top=999');
    expect(users).toEqual([
      { mail: 'a@x.example', userPrincipalName: 'a@x.example', department: 'Sales' },
      { mail: null, userPrincipalName: 'b@x.example', department: 'Pricing' },
    ]);
  });

  it('fails with GRAPH_READ, without response text', async () => {
    const fetch = vi.fn(async () => new Response('Forbidden: details', { status: 403 }));
    const err = await new GraphDirectoryClient({ credential, fetch }).listUsers().catch((e) => e);
    expect(err).toMatchObject({ code: 'GRAPH_READ' });
    expect(String(err)).not.toContain('details');
  });
});
