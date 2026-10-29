# Authorization self-review (constitution: Development Workflow & Quality Gates)

The constitution says changes to authorization, secret handling or special category data need a
**recorded self-review before release**, confirming:

1. the automated authorization tests pass;
2. no secret appears in the client bundle;
3. a response for an unauthorised user contains no sickness reasons.

A second reviewer should check these changes when one is available.

Fill in one block per release that touches these areas.

## Evidence to gather

| Check | How | Where it's tested |
|---|---|---|
| Authorization tests pass | `npm test`, then look for the suites below, all passing | `apps/sync-function/test/unit/auth.test.ts` (signature, issuer, audience, expiry, scope, role, unsigned token, no bypass); `apps/sync-function/test/http/no-leak.test.ts` (401/403 bodies hold nothing from the data); `apps/sync-function/test/http/dashboard.test.ts`, `refresh.test.ts`; `packages/dashboard-ui/test/ApiDashboardClient.test.ts`, `NoAccess.test.tsx` |
| No secret in the client bundle | `npm run build:webpart` ends with "Bundle check passed" (`scripts/check-bundle.mjs`); also open the `.sppkg` and look over its file list | `packages/dashboard-ui/test/check-bundle.test.ts` |
| An unauthorised response has no sickness reasons | `no-leak.test.ts` checks every 401/403 body for reasons, names, departments and figures; check by hand once in the deployed app ([access-control.md](../runbooks/access-control.md), check 2) | as above |
| Reasons appear only in the Sales list | `packages/core/test/buildDashboard.test.ts` ("puts sickness reasons in the Sales section and nowhere else") | |
| Logs carry no personal data | `apps/sync-function/test/unit/log.test.ts`; look at a sample of Application Insights traces after the first live sync | |

## Record

| Date | Release (commit) | Reviewer | Auth tests | Bundle check | 403 body checked | Second reviewer | Notes |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
