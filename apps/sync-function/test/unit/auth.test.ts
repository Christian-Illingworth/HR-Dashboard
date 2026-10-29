// T106 (quickstart Q2, constitution Principle II, FR-004): every request's Entra token and
// app role are checked in code. Keys are generated here; no real tenant is involved.
import { beforeAll, describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from 'jose';

type KeyLike = CryptoKey;
import { checkRequest, type AuthOptions } from '../../src/auth/checkRequest';
import { authorize } from '../../src/auth/authorize';

const TENANT = '11111111-2222-3333-4444-555555555555';
const AUDIENCE = 'api://hr-dashboard-test';
let key: KeyLike; // its public half is in the key set
let otherKey: KeyLike; // not trusted
let options: AuthOptions;

beforeAll(async () => {
  const trusted = await generateKeyPair('RS256');
  key = trusted.privateKey;
  otherKey = (await generateKeyPair('RS256')).privateKey;
  const jwk = { ...(await exportJWK(trusted.publicKey)), kid: 'test-key', alg: 'RS256' };
  options = { tenantId: TENANT, audiences: [AUDIENCE], keys: createLocalJWKSet({ keys: [jwk] }) };
});

async function token(claims: JWTPayload, opts: { signWith?: KeyLike; iss?: string; aud?: string; exp?: string | number } = {}) {
  return new SignJWT({ scp: 'user_impersonation', roles: ['Dashboard.Read'], ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer(opts.iss ?? `https://login.microsoftonline.com/${TENANT}/v2.0`)
    .setAudience(opts.aud ?? AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '10m')
    .sign(opts.signWith ?? key);
}
const bearer = (t: string) => `Bearer ${t}`;

describe('checkRequest', () => {
  it('allows a valid token with user_impersonation and Dashboard.Read', async () => {
    await expect(checkRequest(bearer(await token({})), options)).resolves.toMatchObject({ result: 'allowed' });
  });

  it('accepts the v1 issuer form too', async () => {
    const t = await token({}, { iss: `https://sts.windows.net/${TENANT}/` });
    await expect(checkRequest(bearer(t), options)).resolves.toMatchObject({ result: 'allowed' });
  });

  it.each([
    ['no header', async () => undefined],
    ['not a bearer token', async () => 'Basic abc'],
    ['garbage', async () => 'Bearer not.a.jwt'],
    ['bad signature', async () => bearer(await token({}, { signWith: otherKey }))],
    ['wrong audience', async () => bearer(await token({}, { aud: 'api://someone-else' }))],
    ['wrong issuer (another tenant)', async () => bearer(await token({}, { iss: 'https://login.microsoftonline.com/99999999-0000-0000-0000-000000000000/v2.0' }))],
    ['expired', async () => bearer(await token({}, { exp: Math.floor(Date.now() / 1000) - 60 }))],
    ['missing scp', async () => bearer(await token({ scp: undefined }))],
    ['scp without user_impersonation', async () => bearer(await token({ scp: 'User.Read' }))],
    [
      'unsigned (alg none)',
      async () => {
        const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
        const now = Math.floor(Date.now() / 1000);
        return `Bearer ${enc({ alg: 'none', typ: 'JWT' })}.${enc({ iss: `https://login.microsoftonline.com/${TENANT}/v2.0`, aud: AUDIENCE, exp: now + 600, scp: 'user_impersonation', roles: ['Dashboard.Read'] })}.`;
      },
    ],
  ])('rejects %s as unauthenticated', async (_name, header) => {
    await expect(checkRequest(await header(), options)).resolves.toEqual({ result: 'unauthenticated' });
  });

  it.each([
    ['no roles claim', { roles: undefined }],
    ['another role only', { roles: ['Something.Else'] }],
  ])('refuses a valid token with %s as forbidden', async (_name, claims) => {
    await expect(checkRequest(bearer(await token(claims)), options)).resolves.toEqual({ result: 'forbidden' });
  });

  it('has no option that skips the check', async () => {
    const sneaky = { ...options, skip: true, disabled: true, bypass: true } as unknown as AuthOptions;
    await expect(checkRequest(undefined, sneaky)).resolves.toEqual({ result: 'unauthenticated' });
  });
});

describe('authorize (pure)', () => {
  it.each([
    [{ scp: 'user_impersonation', roles: ['Dashboard.Read'] }, 'allowed'],
    [{ scp: 'openid user_impersonation', roles: ['Other', 'Dashboard.Read'] }, 'allowed'],
    [{ scp: 'user_impersonation' }, 'forbidden'],
    [{ roles: ['Dashboard.Read'] }, 'unauthenticated'],
    [{ scp: 'user_impersonation', roles: 'Dashboard.Read' }, 'forbidden'], // roles must be an array
  ])('%j → %s', (claims, expected) => {
    expect(authorize(claims as JWTPayload)).toBe(expected);
  });
});
