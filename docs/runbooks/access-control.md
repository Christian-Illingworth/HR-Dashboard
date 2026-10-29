# Runbook: access control (Milestone 3, User Story 2)

**For**: IT (an Entra ID administrator and a SharePoint administrator), with HR deciding who is in
the group.

Claude doesn't create groups, app registrations, permissions or consent (CLAUDE.md, Hard
constraints). A person does each step. Step numbers match the setup table in
[research.md](../../specs/001-hr-dashboard/research.md#permissions-and-setup-a-human-must-do).

**Goal (FR-002 to FR-005)**: one Microsoft 365 group controls who can open the dashboard page
*and* who can get its data. Anyone else sees a "no access" message and receives no data.

## Before you start

- **Entra ID P1 is licensed.** Assigning a group to an app role needs it (research R4). Most
  Microsoft 365 business and enterprise plans include it. If it isn't available, stop and see
  "Fallback" below.
- **The Function is deployed** ([deploy-function.md](deploy-function.md)).
- **Check the token lifetime.** Spec FR-003 says a removed user must lose access within 90
  minutes. Access tokens normally last 60–90 minutes. If the tenant has a token-lifetime policy
  longer than 90 minutes for this API, flag it before go-live.

## P1. The access group

1. Create a Microsoft 365 or security group, for example **"HR Dashboard users"**.
2. Add HR and Senior Leadership. The business decides who counts as Senior Leadership; the
   dashboard doesn't.

## P2. The "HR Dashboard API" app registration

1. Register an app, **HR Dashboard API**, single tenant, with no redirect URI and **no client
   secret** (the Function only checks tokens).
2. **Expose an API**:
   - Set the Application ID URI, for example `api://hr-dashboard`.
   - Add a delegated scope, **`user_impersonation`** ("Read HR dashboard data as the signed-in
     user"), with admin consent only.
3. **App roles**: add **`Dashboard.Read`** ("HR Dashboard users"), allowed member types *Users and
   groups*.
4. **Enterprise application** (the service principal):
   - Set **Assignment required = Yes**.
   - Under **Users and groups**, assign the access group to `Dashboard.Read`.
5. Put the values where they're needed (none is a secret):
   - Function app setting **`API_AUDIENCE`** = the Application ID URI. Add the app's client ID
     after a comma if tokens might carry it instead.
   - Function app setting **`TENANT_ID`** = the directory ID.
   - Web part property **API app ID URI** = the Application ID URI.
   - Web part property **API base URL** = `https://<function-app>.azurewebsites.net`.

## P8. Approve the web part's API permission

After the `.sppkg` with `dataSource = api` support is uploaded, the SharePoint admin center shows
a pending API access request: **HR Dashboard API → `user_impersonation`**. Approve it.

## P9. The dashboard page

1. Put the page on a site that only the access group can open. The page and the data must be
   controlled by the same group (FR-003).
2. In the web part's property pane:
   - Set **Data source** to **Live API** (`api`).
   - Set **No-access contact** to the text people should see, for example "To ask for access,
     contact the HR team."

## Checks (record them in [docs/reviews/authorization-self-review.md](../reviews/authorization-self-review.md))

1. **A member** of the group opens the page and sees the dashboard. "Mock data" shows until
   go-live, because the Function is still in mock mode.
2. **A non-member** who reaches the page (send them the link) sees "You don't have access to the
   HR Dashboard" and the contact text. In the browser's developer tools (Network), the
   `/api/dashboard` call shows 403 or a token error, and **no** response body contains names or
   figures.
3. **A direct request** without a token, `GET https://<function-app>.azurewebsites.net/api/dashboard`,
   returns 401 with only `{"error":"unauthenticated",...}`.
4. **Removal**: remove a test member from the group. Within **90 minutes** (once their cached
   token expires) their requests get 403 and the page shows "no access". Note the time it took.

## Fallback without Entra ID P1

Use the `groups` claim instead of an app role (research R4): add the group's object ID to the
token configuration, and change `authorize()` to check it. That's a code change, so it goes
through the normal branch, tests and review. Don't make it during go-live.
