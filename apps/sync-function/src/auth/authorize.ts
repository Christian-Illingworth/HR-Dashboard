// The access rule (FR-002, FR-004, research R4), as a pure function so it has direct tests.
// The access group is assigned to the API's `Dashboard.Read` app role, so membership arrives in
// the token's `roles` claim.

import type { JWTPayload } from 'jose';

export const REQUIRED_SCOPE = 'user_impersonation';
export const REQUIRED_ROLE = 'Dashboard.Read';

export type AuthResult = 'allowed' | 'forbidden' | 'unauthenticated';

export function authorize(claims: JWTPayload): AuthResult {
  const scopes = typeof claims.scp === 'string' ? claims.scp.split(' ') : [];
  if (!scopes.includes(REQUIRED_SCOPE)) return 'unauthenticated';
  const roles = Array.isArray(claims.roles) ? claims.roles : [];
  return roles.includes(REQUIRED_ROLE) ? 'allowed' : 'forbidden';
}
