// Shared HTTP test helpers: test-signed tokens, a store filled by a real mock sync, and the
// OpenAPI contract compiled with ajv.
import { mkdtempSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Ajv } from 'ajv';
import { parse } from 'yaml';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import type { AuthOptions } from '../../src/auth/checkRequest';
import { FileStore } from '../../src/store/fileStore';
import { runSync } from '../../src/sync/runSync';
import { MockBrightHrClient } from '../../src/brighthr/mockClient';
import { MockDirectoryClient } from '../../src/graph/mockDirectory';
import { createLogger } from '../../src/log';
import rawSettings from '../../../../fixtures/settings.json';

export const fixturesDir = resolve(__dirname, '../../../../fixtures');
export const TENANT = '11111111-2222-3333-4444-555555555555';
export const AUDIENCE = 'api://hr-dashboard-test';
export const NOW = '2026-10-27T10:30:00.000Z';

export async function testAuth() {
  const pair = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k', alg: 'RS256' };
  const auth: AuthOptions = { tenantId: TENANT, audiences: [AUDIENCE], keys: createLocalJWKSet({ keys: [jwk] }) };
  const sign = (claims: JWTPayload = {}) =>
    new SignJWT({ scp: 'user_impersonation', roles: ['Dashboard.Read'], ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'k' })
      .setIssuer(`https://login.microsoftonline.com/${TENANT}/v2.0`)
      .setAudience(typeof claims.aud === 'string' ? claims.aud : AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(pair.privateKey)
      .then((t) => `Bearer ${t}`);
  return { auth, sign };
}

/** A file store filled by one mock sync at `now` (the "just launched" case: 90 days of history). */
export async function syncedStore(now = '2026-10-27T10:00:00.000Z') {
  const store = new FileStore(mkdtempSync(join(tmpdir(), 'hrd-http-')));
  store.writeSettings(rawSettings);
  await runSync({
    brightHr: new MockBrightHrClient({ fixturesDir, now: () => now }),
    directory: new MockDirectoryClient({ fixturesDir }),
    store,
    now: () => now,
    brightHrMode: 'mock',
    log: createLogger(() => undefined),
  });
  return store;
}

export const request = (authorization: string | null, query: Record<string, string> = {}) => ({
  headers: new Headers(authorization ? { authorization } : {}),
  query: new URLSearchParams(query),
});

/** Validates a body against a schema in contracts/dashboard-api.openapi.yaml. */
export function contractValidator(schemaName: string) {
  const doc = parse(readFileSync(resolve(__dirname, '../../../../specs/001-hr-dashboard/contracts/dashboard-api.openapi.yaml'), 'utf8'));
  const ajv = new Ajv({ strict: false, validateFormats: false, allErrors: true });
  ajv.addSchema({ $id: 'api', components: doc.components });
  return ajv.getSchema(`api#/components/schemas/${schemaName}`)!;
}
