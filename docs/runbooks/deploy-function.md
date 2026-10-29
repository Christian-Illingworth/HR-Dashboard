# Runbook: deploy the sync function in mock mode (Milestone 2)

**For**: an Azure administrator, with a SharePoint administrator for the data site.

Claude does not create Azure or Entra resources, grant permissions, or deploy (CLAUDE.md, Hard
constraints). A person does each step below. The step numbers P3–P6 match the setup table in
[specs/001-hr-dashboard/research.md](../../specs/001-hr-dashboard/research.md#permissions-and-setup-a-human-must-do).

This deploys the Function on **synthetic mock data** (`BRIGHTHR_MODE=mock`). BrightHR isn't
touched, and no BrightHR credentials are needed yet.

**The web part stays on `dataSource = sample` until the access-control runbook is done**
([access-control.md](access-control.md), tasks T123). Without the app registration and the
access group, the API refuses every request.

## Before you start

- An Azure subscription and an owner for the resources have been agreed.
- The repo builds and its tests pass: `npm ci`, `npm test`, then `npm run build -w @hrd/sync-function`.
  The build bundles to `apps/sync-function/dist/index.js` and copies the synthetic fixtures for
  mock mode.

## P3. Create the resources (UK South)

1. A resource group, for example `rg-hr-dashboard`.
2. A **storage account**, which the Function app needs. The sync queue `sync-requests` lives here
   and is created on first use.
3. **Application Insights**.
4. **Key Vault** in RBAC mode. It stays empty until go-live: BrightHR credentials are added in
   [go-live.md](go-live.md).
5. A **Function app**: Flex Consumption plan, Node.js 22, Linux, using the storage account and
   Application Insights above.

## P4. Managed identity and roles

1. Turn on the Function app's **system-assigned managed identity**.
2. Give it the storage roles that Flex Consumption needs on its storage account (Storage Blob
   Data Owner, Storage Queue Data Contributor), if the portal didn't add them.
3. Give it **Key Vault Secrets User** on the vault. Nothing reads the vault until go-live, but
   this is the place to set it up.

## P5. Graph permission: `Sites.Selected` only, for now

Grant the managed identity the Microsoft Graph **application** permission `Sites.Selected`, with
admin consent. Managed identities have no portal consent page, so use PowerShell or the Graph
API. Don't grant `User.Read.All` yet: mock mode reads departments from the fixtures.

## P6. The data site

1. Create a SharePoint site, **"HR Dashboard Data"**, separate from the dashboard page's site.
   Its owners are only the two named data administrators: the HR data owner and one IT
   administrator (spec FR-028). The access group gets **no** access.
2. As a site owner, run the provisioning script once:
   ```powershell
   ./scripts/provision-lists.ps1 -SiteUrl https://<tenant>.sharepoint.com/sites/<data-site> -ClientId <PnP app client ID>
   ```
   It creates the six lists from
   [contracts/sharepoint-lists.md](../../specs/001-hr-dashboard/contracts/sharepoint-lists.md),
   seeds the settings and status items, and prints the next two steps.
3. Grant the managed identity **write** on this site only, through `Sites.Selected`. The script
   prints the PnP command.
4. Note the Graph site address the script prints, in the form `<host>:/sites/<path>:`.

## App settings

Set these on the Function app. None of them is a secret.

| Setting | Value |
|---|---|
| `BRIGHTHR_MODE` | `mock` |
| `STORE_MODE` | `sharepoint` |
| `DATA_SITE_ID` | the Graph site address from P6, for example `contoso.sharepoint.com:/sites/hr-dashboard-data:` |
| `SYNC_DAYTIME_INTERVAL_HOURS` | `1` (or `2` if BrightHR's rate limits need it, FR-024) |
| `TENANT_ID` | the tenant's directory ID |
| `API_AUDIENCE` | the HR Dashboard API's app ID URI (from the access-control runbook; until then the API refuses everything) |

There's no setting that turns authorization off, and there mustn't be one.

## Deploy

```powershell
cd apps/sync-function
npm run build
func azure functionapp publish <function-app-name>
```

`func` is Azure Functions Core Tools v4. Publishing sends `dist/`, `host.json`, the `package.json`
dependencies and the copied synthetic `fixtures/`.

## Check

1. In the Function app, run **syncRun** once by putting any message on the `sync-requests` queue,
   or wait for the next sync hour (07:00–19:00 UK time on a working day, or 02:00).
2. In the data site, `HRD Sync Status` shows `LastAttemptOutcome` = Succeeded and `DataMode` =
   Sample. `HRD Employees` has 19 items and `HRD Absences` about 22, the synthetic people only.
3. In Application Insights, log lines are events with counts only, for example
   `{"event":"sync.succeeded","counts":{...}}`. No names, emails or reasons should appear. If any
   do, stop and report it.
4. `GET https://<function-app>.azurewebsites.net/api/dashboard` with no token returns **401** and
   `{"error":"unauthenticated",...}` with no data.

## Rolling back

Stop the Function app. The data site holds synthetic data only; delete its items, or the site,
if the deployment is abandoned.
