// Verifies the caller's Entra ID access token on every request (constitution Principle I,
// research R4): RS256 signature against the tenant's keys, issuer = the tenant, audience = the
// HR Dashboard API, not expired; then the access rule in authorize(). There is no way to skip it.

import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { authorize } from './authorize';

export interface AuthOptions {
  tenantId: string;
  /** The API's app ID URI and, optionally, its client ID. */
  audiences: string[];
  keys: JWTVerifyGetKey;
}

export type CheckResult = { result: 'allowed'; claims: JWTPayload } | { result: 'forbidden' } | { result: 'unauthenticated' };

export async function checkRequest(authorization: string | null | undefined, opts: AuthOptions): Promise<CheckResult> {
  const match = /^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(authorization?.trim() ?? '');
  if (!match) return { result: 'unauthenticated' };
  let claims: JWTPayload;
  try {
    ({ payload: claims } = await jwtVerify(match[1]!, opts.keys, {
      algorithms: ['RS256'],
      issuer: [`https://login.microsoftonline.com/${opts.tenantId}/v2.0`, `https://sts.windows.net/${opts.tenantId}/`],
      audience: opts.audiences,
    }));
  } catch {
    return { result: 'unauthenticated' };
  }
  const result = authorize(claims);
  return result === 'allowed' ? { result, claims } : { result };
}

const keySets = new Map<string, JWTVerifyGetKey>();

/** The tenant's signing keys, fetched and cached by jose. */
export function tenantKeys(tenantId: string): JWTVerifyGetKey {
  let keys = keySets.get(tenantId);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`));
    keySets.set(tenantId, keys);
  }
  return keys;
}
