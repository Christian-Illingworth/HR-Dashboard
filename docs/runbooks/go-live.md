# Runbook: go-live on BrightHR data (Milestone 3)

**For**: the project owner, with a BrightHR admin, an Azure administrator, an Entra ID
administrator and the HR data owner.

Claude doesn't call live BrightHR, handle credentials or change Azure, Entra or Key Vault
(CLAUDE.md, Hard constraints). A person does every step here. Step numbers match the setup table
in [research.md](../../specs/001-hr-dashboard/research.md#permissions-and-setup-a-human-must-do).

**Goal**: switch the Function from synthetic mock data to BrightHR and Entra ID through
configuration only. No code changes during go-live.

## Before you start

- The Function is deployed in mock mode and syncing ([deploy-function.md](deploy-function.md)).
- Access control is in place and checked ([access-control.md](access-control.md)): members see
  the dashboard with "Mock data", non-members see "no access". The self-review
  ([authorization-self-review.md](../reviews/authorization-self-review.md)) is signed.
- Live access to BrightHR's API has been approved by the business, and the data protection review
  is under way.

## 1. BrightHR's answers (B1–B12)

Ask BrightHR the questions in
[research.md](../../specs/001-hr-dashboard/research.md#questions-for-brighthr). Record each
answer in research.md, and update the BrightHR row and Known gaps in `CLAUDE.md`.

Stop and raise it with the project owner if:
- **B4**: credentials can't be limited to reads. The code only ever reads (an allow-list refuses
  every other call), but the constitution expects read-only access where BrightHR offers it.
- **B12**: data is processed or stored outside the UK or EEA, or the terms of use don't allow this
  use.
- **B5 or B7**: the answers change how history or future leave is built. That needs a code change
  first, through the normal branch and tests.

## 2. Sync frequency

If BrightHR's rate limits (B1) can't take an hourly sync of every employee's absences, set the
Function app setting `SYNC_DAYTIME_INTERVAL_HOURS` to `2` (FR-024). Each sync makes one employee
query per 100 people plus one absence query per employee.

## 3. P5: let the Function read departments

Grant the Function's managed identity the Microsoft Graph **application** permission
`User.Read.All`, with admin consent. Managed identities have no consent page, so use PowerShell:

```powershell
Connect-MgGraph -Scopes 'AppRoleAssignment.ReadWrite.All','Application.Read.All'
$mi    = Get-MgServicePrincipal -Filter "displayName eq '<function-app-name>'"
$graph = Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'"
$role  = $graph.AppRoles | Where-Object { $_.Value -eq 'User.Read.All' }
New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $mi.Id -PrincipalId $mi.Id -ResourceId $graph.Id -AppRoleId $role.Id
```

The Function asks Graph for `mail`, `userPrincipalName` and `department` only.

## 4. P7: BrightHR credentials

1. In BrightHR API Management, register an API app for the HR Dashboard, read-only if B4 allows.
2. Put its client ID and secret in the Key Vault as two secrets, for example
   `brighthr-client-id` and `brighthr-client-secret`. Don't paste them anywhere else: not in
   chat, email, tickets or files.
3. Add two Function app settings as **Key Vault references** (not values):

   | Setting | Value |
   |---|---|
   | `BRIGHTHR_CLIENT_ID` | `@Microsoft.KeyVault(VaultName=<vault>;SecretName=brighthr-client-id)` |
   | `BRIGHTHR_CLIENT_SECRET` | `@Microsoft.KeyVault(VaultName=<vault>;SecretName=brighthr-client-secret)` |

4. In the Function app's **Environment variables**, check both references show a green tick.
   `BRIGHTHR_MODE` is still `mock`, so nothing calls BrightHR yet.

## 5. Contract tests

The contract tests compare the *shape* of BrightHR's responses (field names, types and `$type`
values) with the synthetic fixtures. They print differences only, never values.

1. On a managed work device, from the repository root, set the credentials in the current
   PowerShell session only (from Key Vault, without saving them to a file or history):

   ```powershell
   $env:BRIGHTHR_CLIENT_ID     = (Get-AzKeyVaultSecret -VaultName <vault> -Name brighthr-client-id -AsPlainText)
   $env:BRIGHTHR_CLIENT_SECRET = (Get-AzKeyVaultSecret -VaultName <vault> -Name brighthr-client-secret -AsPlainText)
   $env:RUN_LIVE_CONTRACT = '1'
   npx vitest run apps/sync-function/test/contract
   Remove-Item Env:BRIGHTHR_CLIENT_ID, Env:BRIGHTHR_CLIENT_SECRET, Env:RUN_LIVE_CONTRACT
   ```

   Use BrightHR's sandbox instead if one exists (B2).
2. If a difference is reported, change the mock and the fixtures in `fixtures/brighthr/` to match
   (made-up data only), and fix any code that depended on the old shape, through the normal
   branch and tests. Run the contract tests again until they pass.
3. Don't save, copy or screenshot the test output if it ever shows a value rather than a field
   path. Report it as a bug.

## 6. Settings for absence types and pregnancy-related sickness

In the data site's `HRD Settings` list, the HR data owner fills these from BrightHR's answers (B8,
B9). See [data-model.md §2.6](../../specs/001-hr-dashboard/data-model.md).

- **`AbsenceTypeMap`**: one line per BrightHR `displayName` that isn't annual leave, in the form
  `<displayName> => <category>`. Categories: `publicHoliday`, `compassionate`, `unpaid`, `other`.
  For example `Compassionate leave => compassionate`.
- **`PregnancyRelatedReasons`**: one sickness reason per line, exactly as BrightHR shows it. These
  absences are left out of the Bradford Factor.
- **`SalesDepartments`**: check the Sales department names against Entra ID (one per line).

## 7. Clear the synthetic data

So that synthetic records never sit beside real ones, delete every item in the data site's lists
`HRD Employees`, `HRD Employee History`, `HRD Absences` and `HRD Sickness Reasons`. Leave
`HRD Settings` and `HRD Sync Status`.

## 8. P10: switch to live

1. Set the Function app setting **`BRIGHTHR_MODE`** to **`live`**. The app restarts.
2. Start a sync: put any message on the `sync-requests` queue, or press **Refresh** on the
   dashboard.

If the live settings are missing or wrong, the Function refuses to start rather than falling back
to mock data. Set `BRIGHTHR_MODE` back to `mock` to recover.

## 9. Watch the first sync

In `HRD Sync Status`:

- `LastAttemptOutcome` is **Succeeded** and `DataMode` is **Live**. The "Mock data" label has gone
  from the dashboard.
- `Warnings` holds counts only:
  - **`departmentNotSet`**: people with no matching department in Entra ID. Ask IT to fill in
    their department. Until then they appear under the department "Not set" and still count in
    the company totals.
  - **`skippedRecords`**: BrightHR records the sync couldn't read. Anything above 0 needs a look
    at the logs.

If the outcome is **Failed**, `LastFailureCode` says why, for example `BRIGHTHR_AUTH` (the
credentials) or `BRIGHTHR_RATE_LIMIT` (go back to step 2). In Application Insights, log lines are
event names and counts only. If a name, email or sickness reason ever appears in a log, stop,
set `BRIGHTHR_MODE` back to `mock` and report it.

Then, as a member of the access group, check that the headline figures look right against
BrightHR for one department.

## 10. Data inventory

Update [docs/data-inventory.md](../data-inventory.md) with BrightHR's data region and terms of use
(B12), and the date live data started. Update the BrightHR row in `CLAUDE.md`.

## Rolling back

1. Set `BRIGHTHR_MODE` to `mock`.
2. Clear the lists as in step 7, so no BrightHR records stay beside the synthetic ones. The next
   sync fills them with synthetic data again.
3. If live data is being abandoned, also remove the Key Vault references and secrets, and the
   Function's `User.Read.All` permission.
