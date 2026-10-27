# Research: HR Dashboard (feature 001)

**Date**: 2026-10-27 | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

This file resolves the open points in the plan's Technical Context. Each decision gives the
choice, the reason, and the alternatives considered. The last three sections list the
questions to ask BrightHR, the permissions a human must grant, and the departures from the
plan input.

The BrightHR findings come from the public Customer API documentation
(<https://docs.bright.hr/api/customer-api-v1>, OpenAPI bundle v1.0.373554). Nobody has called
the API, and nobody may until a human switches to live data.

---

## R1. UI components and charts

**Decision**: build the UI from the Consultiv web design kit only. Draw the four trend charts
as small hand-built React SVG components: column, stacked column, and column with a line
overlay. They use the kit's `--series-*` tokens in kit order and the `.tone-*` classes. The
rest of the UI uses kit components: `.kpi-strip`/`.kpi-mini` for the KPI row, `.seg` for the
Today/Upcoming switch, `.select-trigger` + `.menu` for filters, `.table` for chart table views
and the Sales list, `.notice` for freshness and error banners, `.skeleton` for loading, and
`.empty-state`.

**Rationale**: constitution Principle III forbids Fluent UI and other component libraries. The
project owner confirmed this choice on 2026-10-27. The kit has a donut and a `.bar-list` but no
time-series charts. Four chart shapes over 7 points are small enough to build and test, and
building them ourselves lets every chart meet Principle IV from the start: focusable data
points, tooltips by mouse, touch and keyboard, a table view, and patterns as well as colour.

**Chart rules** (they apply to every chart):
- Forecast values: hatched fill + dashed outline + a "Forecast" label on the axis and in the
  tooltip. Booked values: a lighter tint + a "Booked" label. Actual values: solid.
- Selected month: a background band using the kit's highlight tint, a bold axis label, and
  "Current month"/"Selected month" in the tooltip. The current month also gets "to date".
- Series are told apart by colour, by a fixed stack order with a legend, and by an SVG pattern
  per series in stacked charts. Lines use dot markers.
- One value scale per chart, starting at zero (DESIGN.md: "keep every bar on a page on one
  scale").
- Data points use roving `tabindex`. Arrow keys move between them, and focus shows the tooltip.
  Every chart has a "Show table" control that swaps it for a `.table` with the same values and
  labels.

**Alternatives considered**:
- *Fluent UI React Charting* (from the plan input): ruled out by Principle III. It would also
  bring Fluent theming and global styles that fight the kit, plus roughly 1 MB of bundle.
- *A general chart library (Recharts, Chart.js, ECharts)*: each needs theming to kit tokens,
  ships its own tooltip and focus behaviour that would need work to reach WCAG AA, and adds a
  dependency to justify under Principle VIII. Not worth it for four fixed shapes.
- *Asking for chart components in the design kit's source*: the best long-term home. Charts
  are built in `packages/dashboard-ui` now, structured so they can move to the kit later. That
  move is a kit change, made at the kit's source.

## R2. Keeping the kit's styles in, and SharePoint's styles out

**Decision**: the SPFx web part attaches an **open shadow root** to its DOM element and renders
the React app inside it. At build time, a small PostCSS step turns the kit's
`tokens.css`, `base.css` and `components.css` (read-only inputs) plus the project stylesheet
into one shadow-scoped stylesheet:
- `:root` → `:host`;
- `html`/`body` rules → `.cu-root` (the app's root wrapper);
- `:host { all: initial; }` first, so inherited SharePoint font, colour and line height stop
  at the boundary.

The Poppins `@font-face` rules are added once at document level, because `@font-face` inside
a shadow root isn't reliably applied. The web part reads font URLs from its own bundle
assets. `kit.js` is **not** used. Its document-level listeners don't see events inside a
shadow root, so menus, the segmented control and tooltips get rebuilt as React components that
use the kit's classes.

**Rationale**: Principle III requires two-way style isolation. A shadow root is the only
mechanism that blocks both directions without renaming every kit class. Doing the transform at
build time leaves `design-kit/` untouched.

**Alternatives considered**: CSS Modules or prefixing every kit selector (this changes kit
class names and breaks the "use the kit's classes" rule); an iframe (breaks SharePoint mobile
app sizing and doubles sign-in); SPFx's default global CSS (leaks both ways).

**To check during implementation**: modals and menus must render inside the shadow root, not in
`document.body`. Focus-visible styles must work across the boundary. The SharePoint mobile app
(iOS WKWebView, Android WebView) must support shadow DOM. All current versions do. Confirm on
real devices in quickstart scenario Q9.

## R3. How the web part gets its data

**Decision**: the web part calls the project's Azure Function API only, using SPFx
`AadHttpClient`, which gets a token for the API's Entra app registration on behalf of the
signed-in user. The Function checks the token and the access-group app role on every request,
reads the synced data, works out the dashboard figures for the requested filters, and returns
them. The web part never reads SharePoint lists itself. PnPjs is not used.

**Rationale**: the project owner chose this on 2026-10-27. It meets the constitution word for
word:
- Security & Data Handling: synced data is readable only by the back end's identity and named
  administrators. The lists sit in a data site that the access group can't open (R6).
- Principle II and FR-004: the server-side authorization check is our own code, so it has
  automated tests (R4).
- Principle I: the front end talks only to the project's own back end.

**Costs accepted**: a Function cold start can land on page load (see R15), and the Power
Automate fallback can no longer serve the page (see R16).

**Alternatives considered**: *PnPjs reading lists shared with the access group* (from the plan
input). It needs a reading of "synced data" that the constitution doesn't state, and its only
authorization check is SharePoint permissions, which can't be unit-tested.

## R4. Authorization

**Decision**:
- A single Entra app registration, **HR Dashboard API**, exposes the delegated scope
  `user_impersonation` and one app role, `Dashboard.Read`. Its enterprise app has
  **assignment required = Yes**, and IT assigns **the access group** to `Dashboard.Read`.
- The Function checks each request in code using `jose`. It verifies the signature against
  the tenant's JWKS, and checks issuer = the tenant, audience = the API's app ID URI, the
  expiry, `scp` contains `user_impersonation`, and `roles` contains `Dashboard.Read`. Anything
  else gets 401 (bad or missing token) or 403 (valid token without the role), with no body
  data.
- The check is one pure function, `authorize(claims, config)`, plus a thin token verifier.
  Both are unit-tested with keys generated during the test. There is **no** configuration flag
  that turns authorization off.
- The SharePoint page is shared with the same group, so one group controls both page and data
  (FR-003).
- The web part treats a token failure for an unassigned user (AADSTS50105/501051) and a 403
  the same way: it shows the "no access" message with the contact text from the web part
  property.

**Rationale**: app roles put the authorization fact in the token, so no Graph call is needed
per request, and removing someone from the group takes effect on their next token (FR-003,
spec US2 scenario 4). Checking in code instead of relying on App Service Authentication
alone makes the rule testable (Principle II).

**Alternatives considered**: a `groups` claim (fails above 200 groups and is harder to read);
a Graph `checkMemberGroups` call per request (slower, needs another permission); App Service
Authentication on its own (configuration outside the repo that can't be tested).

**To confirm**: assigning a *group* to an app role needs Microsoft Entra ID P1. Most Microsoft
365 business and enterprise plans include it. Ask IT. If it isn't licensed, the fallback is the
`groups` claim with the group's object ID in configuration, under the same tests.

## R5. Back-end host

**Decision**: Azure Functions on the **Flex Consumption** plan, **Node.js 22 LTS**,
**TypeScript**, using the v4 programming model (`@azure/functions` 4.x), in **UK South**.
The functions are:

| Function | Trigger | Purpose |
|---|---|---|
| `syncSchedule` | Timer, every hour on the hour (UTC) | Decides whether this hour is a sync hour (R7). If so, queues a sync request. |
| `syncRun` | Storage queue `sync-requests` | Runs one sync (R7), holding the sync lock. |
| `dashboard` | HTTP GET `/api/dashboard` | Returns the dashboard data ([contracts/dashboard-api.openapi.yaml](contracts/dashboard-api.openapi.yaml)). |
| `refresh` | HTTP POST `/api/refresh` | Applies the 15-minute limit, then queues a sync request. |

The queue lives in the storage account that the Function app needs anyway, so it adds no new
service. The Function app uses a **system-assigned managed identity** for Key Vault, Microsoft
Graph and its storage account.

**Rationale**: the constitution requires a server-side back end and Key Vault. Functions is
the smallest Azure host the company already licenses. Flex Consumption is the current
serverless plan for new Node apps, supports managed identity for storage, and costs almost
nothing at this traffic. TypeScript lets `packages/core` be shared with the UI harness.

**Alternatives considered**: App Service (always on, more cost, nothing gained at this scale);
Container Apps (more to run); Power Automate (see R16).

## R6. Where synced data is stored

**Decision**: SharePoint Online lists in a **dedicated data site**, "HR Dashboard Data",
written and read only by the Function through Microsoft Graph. The site's permissions are its
owners, the two named data administrators (the HR data owner and one IT administrator, FR-028),
plus the Function's managed identity, granted `write` on this site
only through **`Sites.Selected`**. The access group gets **no** access to the data site. The
dashboard page lives on a separate site that the access group can open.

The lists are defined in [contracts/sharepoint-lists.md](contracts/sharepoint-lists.md):
`HRD Employees`, `HRD Employee History`, `HRD Absences`, `HRD Sickness Reasons`,
`HRD Sync Status` and `HRD Settings`.

**Rationale**: the plan input asked for SharePoint lists. They keep data in the Microsoft 365
tenant, need no new service, and give administrators a familiar way to inspect data and
edit settings (Sales department names and the absence type mapping, FR-019). A separate site
gives simple site-level permissions with no broken inheritance on individual lists.
`Sites.Selected` keeps the managed identity away from every other site.

**Change from the plan input**: no "monthly aggregated metrics" list. Because the Function now
serves the page (R3), it works out figures on each request from the synced records. That
removes a per-filter-combination store and its change detection (R15). The plan input's
"Sales absence list" and "sickness-detail list" become `HRD Absences` and
`HRD Sickness Reasons`.

**Alternatives considered**: Azure Table or Blob storage in the Function's storage account
(simpler for the code, but administrators can't easily see the data, and HR can't edit
settings); Dataverse (needs licences); Azure SQL (a new service, Principle VIII).

**Limits to keep in mind**: Graph list reads are paged. Writes are one request per item, or
JSON batches of up to 20. SharePoint throttles bursts. At the expected scale (R17), a full
sync writes at most a few hundred changed items. Unchanged items aren't rewritten (each item
stores a hash of its fields).

## R7. Sync schedule and process

**Decision**:
- `syncSchedule` runs hourly in UTC. Code converts the time to Europe/London and queues a sync
  when: (a) it is a working day (Monday to Friday, not an England and Wales bank holiday) and
  the London hour is 07 to 19 inclusive (13 runs), or (b) the London hour is 02, on every day
  of the week (the overnight run). This handles BST without the time-zone app setting. On
  Flex Consumption that setting isn't available on Linux anyway.
- `SYNC_DAYTIME_INTERVAL_HOURS` app setting: `1` (default) or `2`. Set to `2`, daytime syncs
  run at 07, 09 … 19, and the freshness threshold (M16) becomes 3 hours (FR-024 fallback,
  clarified 2026-10-27).
- `syncRun` takes a lock first. It sets `RunningSince` on the `HRD Sync Status` item with an
  ETag `If-Match`. A lock older than 30 minutes counts as stale. If the lock is held, the
  message is dropped, because the running sync will produce fresh data.
- Sync steps:
  1. Load settings.
  2. Fetch all employees, current and terminated (`POST /employees/v1/query`, paged, page
     size 100, twice: `isTerminated: false` and `isTerminated: true`). Keep terminated
     employees whose `employment.end` falls in the retention window.
  3. Fetch Entra ID users once (`GET /users?$select=mail,userPrincipalName,department`,
     paged), and match on email, ignoring case (R10).
  4. For each kept employee, fetch absences with `from` = today − 90 days and `to` = the
     last day of the month 3 months ahead (`POST /absences/v1/query`, paged, at most 4
     requests at once, respecting `429`/`Retry-After` with exponential backoff).
  5. Reconcile (R11), apply retention, and write changes to the lists.
  6. Record the outcome in `HRD Sync Status`.
- A failure in any step marks the attempt as failed and keeps the last good data (FR-024).
  Failure codes are fixed strings, such as `BRIGHTHR_AUTH`, `BRIGHTHR_RATE_LIMIT`,
  `GRAPH_WRITE` and `UNKNOWN`, with no personal data.

**Rationale**: matches the clarified schedule (FR-024). A queue between the triggers and the
work keeps HTTP requests short and stops overlapping runs.

**Rate limits are unknown**: about 14 runs a day × (number of employees + employee pages)
requests. With 150 employees that's about 2,200 BrightHR requests a day. If BrightHR's limits
are lower, the first lever is the spec's fallback: `SYNC_DAYTIME_INTERVAL_HOURS=2`, which
roughly halves daily requests. The next lever is fetching only changed employees, which needs an
"updated since" filter that BrightHR doesn't document (see the questions for BrightHR).

## R8. Manual refresh and its 15-minute limit

**Decision**: `POST /api/refresh` (authorized as in R4) reads `LastManualRefreshAt` from
`HRD Sync Status`. If it is under 15 minutes ago, the endpoint returns 429 with `nextAllowedAt`
and `Retry-After`. Otherwise it writes the new time with ETag `If-Match`, so of two clicks at
the same moment only one wins, then queues a sync and returns 202 with `nextAllowedAt`. The UI
polls `GET /api/dashboard` every 15 seconds for up to 10 minutes, until `freshness.lastSuccessAt`
changes, then redraws every section (spec US4 scenario 3).

**Rationale**: FR-025 sets one limit shared by all users, so the limit has to be stored
centrally. Storing it in the status item avoids adding another store.

**Alternatives considered**: a per-user limit (doesn't meet the spec); running the sync inside
the HTTP request (it can take minutes, beyond what an HTTP request should hold open).

## R9. BrightHR Customer API: what it gives us and what it doesn't

**Endpoints used** (read-only; see [contracts/brighthr-consumed.md](contracts/brighthr-consumed.md)):

| Endpoint | Used for | Notes |
|---|---|---|
| `POST https://login.brighthr.com/connect/token` | OAuth2 client-credentials token | No scopes defined. Credentials come from an admin registering an API app in BrightHR API Management. |
| `POST /employees/v1/query` | Employees, start and end dates, job title, email for matching | Filters: `isTerminated`, `email`, `externalReference`. Paged with `continuationToken`, `pageSize` ≤ 100. |
| `POST /absences/v1/query` | Approved absences | `filters.employeeId` **required**. `from` **at most 90 days in the past**. Paged, ≤ 100. |

**Never called**: `PUT /employees/v1/{id}/external-reference` (a write) and
`POST /blip/v1/clockings/query` (not needed). The BrightHR client allows only the three
endpoints above. A unit test checks that every other path, and every method that isn't POST,
is refused.

**Consequences for this plan** (each has a spec follow-up in [plan.md](plan.md)):

1. **Only approved absences.** The documented endpoint lists approved absences. There is no
   status field. *Decision (project owner, 2026-10-27)*: build for approved leave only. The
   leave chart and the Sales list show "Pending: not available from BrightHR yet" where pending
   would appear. Ask BrightHR. Amend FR-011 and FR-019 when they answer.
2. **No department.** See R10.
3. **90-day lookback.** Absences more than 90 days old can't be fetched, so the dashboard
   builds its own absence history from the first sync onwards (R11). At launch, sickness
   history and the Bradford Factor cover only about 90 days, and the forecast needs 3 complete
   months.
4. **No working pattern.** Leave and absence days are worked out from the boundaries on a
   Monday-to-Friday calendar without bank holidays (R12). Part-time staff's leave is
   over-counted. Sickness uses BrightHR's own `duration` where present.
5. **Absence types are coarse.** `$type` is `Holiday` (annual leave + public holidays +
   mandatory leave), `Sickness`, `Toil` or `Other`. Compassionate and unpaid leave can be told
   apart only by `displayName`, through a mapping in settings (R13).
6. **Starters and leavers** come from `employment.start` and `employment.end`. A future `end`
   is treated as "known leaver (serving notice)" and a future `start` as "known starter". Ask
   BrightHR whether future dates appear.
7. **Credentials can't be made read-only** as far as the docs show: there are no scopes, and a
   write endpoint exists. The control is in our code (the endpoint allow-list above) plus a
   question to BrightHR (Principle I: "read-only where BrightHR supports it").
8. **`note`** is free text that could hold health details. It is never synced. The sickness
   reason comes from `reason.description` only.

## R10. Where the department comes from

**Decision** (project owner, 2026-10-27): **Entra ID `department`**, read through Graph by the
Function's managed identity with the **`User.Read.All` application permission**. BrightHR
`email` is matched to Entra `mail` or `userPrincipalName`, ignoring case. An employee with no
match, or a blank department, gets the department **"Not set"**. The dashboard shows it as a
filter option and lists how many employees have it on the sync status, so HR can fix the
data at source.

**Consequences**:
- FR-019's "list of **BrightHR** department names" becomes "list of **Entra ID** department
  names" (spec follow-up).
- Leavers whose Entra accounts were deleted before the first sync have no department.
  They count in "All" and under "Not set".
- Department and role history starts at the first sync (R11). Months before that use each
  employee's department and role at the first sync, and the response marks this.

**Alternatives considered**: an HR-maintained email-to-department list (manual and can drift);
waiting for BrightHR (blocks filters and the Sales list). Ask BrightHR anyway, because a
department field in BrightHR would remove the Graph permission.

## R11. Building history from the first sync onwards

**Decision**:
- **Absences**: on each sync, for each employee, the set of absences BrightHR returns for the
  fetched window is the truth *for that window*. Stored absences for that employee that overlap
  the window but weren't returned are deleted (cancelled or rejected). Absences that end before
  the window are frozen, because they can no longer be fetched.
- **Coverage**: `HistoryStartDate` = the first successful sync's date − 90 days, stored in
  `HRD Sync Status`. Each month in a chart is marked `full`, `partial` or `none` against it,
  and the chart shows "No absence data before <date>" for partial and empty months. Forecasts
  use only `full` months.
- **Bradford Factor**: uses the 52 weeks before today, or the period since `HistoryStartDate`
  if shorter. The KPI then says "Based on data since <date>".
- **Department and role history**: on each sync, the Function upserts one
  `HRD Employee History` row per employee for the current month. Past months' rows are frozen.
- **Employment dates** (headcount, starters, leavers) don't depend on the 90-day window, if
  BrightHR returns terminated employees with their dates (question for BrightHR). Attrition
  can then cover 12 months from the first sync.
- **Retention** (spec assumption: 13 months): absences that ended more than 13 months before
  today are deleted. Leavers are deleted 13 months after `employment.end`, with their history
  rows. History rows older than 13 months are deleted. Sickness reasons are kept only while
  needed (R13).

**Rationale**: makes the best of the 90-day limit and is honest about gaps (Principle V).

## R12. Counting days

**Decision**:
- **Calendar**: working days are Monday to Friday, excluding England and Wales bank holidays.
  These come from a **bundled copy** of gov.uk `bank-holidays.json`, the `england-and-wales`
  division, kept in `packages/core`. Sync logs a warning, and the status records it, when the
  bundled data ends before the last day of the window plus 3 months. Tests use the bundled copy.
- **"Today"** is the Europe/London date. BrightHR dates are local dates and are used as they
  are.
- **Holiday, TOIL and Other days**: count working days from start to end inclusive. A
  `LocalDatePart` boundary of `FirstHalf` or `SecondHalf` counts that day as 0.5. A
  `LocalDateTime` boundary counts its day as 1, except that an absence starting and ending on
  the same day with `LocalDateTime` boundaries counts as 0.5. This is a project rule (BrightHR
  gives no length for these types) and is recorded in the metric catalogue as one to confirm.
- **Sickness days**: if `duration` is in Days, use it as the total. If it is in Minutes,
  divide by `StandardDayHours` × 60 (a setting, default 7.5 hours). Spread the total across
  months in proportion to each month's calendar working days in the absence. With no
  `duration`, fall back to the calendar count. Open-ended sickness counts up to and including
  today.
- **Month split**: days are split by the month they fall in. An episode is counted in the
  month it starts (spec edge case).

**Rationale**: one calendar for every type keeps month splits consistent and testable. Using
BrightHR's sickness `duration` keeps the spec's "use BrightHR lengths" assumption where the
API allows it.

## R13. Absence types and sickness reasons

**Decision**:
- Each absence gets one **category**: `annualLeave`, `publicHoliday` (excluded from every
  figure), `sickness`, `compassionate`, `unpaid` or `other`. `$type: Sickness` is always
  `sickness`. The others come from the `AbsenceTypeMap` setting, matched on `displayName`,
  with defaults: `Holiday` → `annualLeave`, `Toil` → `other`, `Other` → `other`. An unknown
  `$type` → `other` (spec edge case). The map is stored as lines in `HRD Settings`, such as
  `Bank holiday => publicHoliday` and `Compassionate leave => compassionate`. The real
  `displayName` values are a question for BrightHR.
- `displayName` is stored on each absence, so a mapping change applies to history at the
  next request, without re-fetching.
- **Pregnancy-related sickness** is left out of the Bradford Factor (spec assumption). At sync
  time, a sickness absence whose `reason.description` is in the `PregnancyRelatedReasons`
  setting gets `PregnancyRelated = true`. Only that flag is kept in history. It is special
  category data and is listed as such in the data inventory.
- **Sickness reasons** (`reason.description`) are stored in `HRD Sickness Reasons` only for
  sickness absences of employees in a Sales department that overlap today to today + 14 days
  or are open-ended. They are deleted at the next sync once the absence leaves that range.
  They appear only in the Sales list (FR-006).

## R14. Mock mode and sample data

**Decision**:
- `BRIGHTHR_MODE` app setting: `mock` (the default when unset) or `live`. Only a human sets
  `live`. In `mock`, the BrightHR client is replaced by `MockBrightHrClient`, which serves
  `fixtures/brighthr/` with the real API's behaviour: paging, the required `employeeId`, the
  90-day `from` rule (it returns BrightHR's documented 400), and approved absences only. The
  Graph user lookup is likewise replaced by `fixtures/entra/users.json`.
- `STORE_MODE` app setting: `sharepoint` (in Azure) or `file` (local development, a JSON file
  per list under `.local-data/`, which is gitignored).
- Every stored sync result carries `DataMode` (`Sample` or `Live`). The API returns it, and
  the UI shows a "Sample data" `.notice` on every view when it is `Sample` (FR-029,
  Principle VII).
- The **UI dev harness** (`packages/dashboard-ui`, Vite) runs without SharePoint or Azure. It
  uses a harness-only data client that calls `packages/core` in the browser over the same
  fixtures, with `?today=YYYY-MM-DD`. This code never goes into the web part bundle; a bundle
  check enforces this. Production calculations happen only in the Function.
- Fixtures use made-up people and the spec's roles (Energy Analyst, Senior Energy Analyst,
  Senior Pricing Specialist, Sales Team Manager), with departments including "Sales". Expected
  values for tests are worked out by hand in `fixtures/expected/*.md`, separately from the code.
- When live access is confirmed, contract tests (`apps/sync-function/test/contract/`, skipped
  unless a human runs them with live settings) compare real responses' shape with the fixtures
  (Principle VII).

## R15. Performance (SC-002: data within 5 s on office broadband, 10 s on 4G mobile)

**Decision**: the `dashboard` function loads the stored records once, keeps them in memory
keyed by `HRD Sync Status.LastSuccessAt`, and works out each response from memory. Each
request costs one Graph read of the status item, plus a full reload only after a new sync.
Expected sizes (R17): under 3,000 items, so a reload is about 5 to 10 paged Graph reads. The
calculations take milliseconds. The response is under 50 KB, and the web part bundle should be
under 300 KB gzipped (no chart library).

**Risk**: a Flex Consumption cold start plus a full reload could take 3 to 5 seconds. If
quickstart scenario Q10 misses the target, set **one always-ready instance** for the
`dashboard` function. It is a configuration change with a small monthly cost, and the
decision is recorded in Complexity Tracking at that point.

**Alternatives considered**: precomputing one payload per department × role combination at
sync time (the earlier design, needed when the browser read lists directly). No longer needed,
and it adds change detection and many more list writes.

## R16. Power Automate fallback

**Decision**: **not planned**. Recorded here for the record.

**Rationale**: with the Function serving the page (R3), "no Azure" also means no back end,
which the constitution requires (Principle I). Power Automate also can't run calculations
with unit tests (Principle VI), and the premium HTTP connector needs extra licences
(Principle VIII). If Azure turns out to be unavailable, the plan needs to be redone, not
switched to a fallback.

## R17. Scale assumptions

**Assumption**: under 250 employees, under 20 dashboard users, up to 15 departments and 30
job titles. The design is comfortable up to about 500 employees. Beyond that, the sync's
per-employee BrightHR calls (R7) are the first limit. Confirm headcount with HR.

## R18. Project layout, tooling and versions

**Decision**: one repository with **npm workspaces** for `packages/core`,
`packages/dashboard-ui` and `apps/sync-function`. The **SPFx project `apps/webpart` is outside
the workspaces**, with its own `package-lock.json`. It uses `packages/dashboard-ui` as a built
local package (`file:` dependency on its `dist`). SPFx is fussy about hoisted dependencies and
pins its own React and TypeScript versions.

- **SPFx**: the latest GA version at implementation time. On 2026-10-27, as far as the
  previous session could tell, that's 1.23 (May 2026) with React 17. 1.24 brings React 18 and
  was in beta in August 2026. Check both and the supported Node version when implementation
  starts. `packages/dashboard-ui` must work with the React version SPFx ships, so it treats
  React as a peer dependency and avoids React 18-only APIs unless SPFx supports them.
- **Testing**: Vitest across the workspaces. React Testing Library for components. Playwright
  with `@axe-core/playwright` against the harness for accessibility and end-to-end checks.
- **Dates**: plain `YYYY-MM-DD` strings and small pure helpers in `packages/core`. `Intl` is
  used only for the Europe/London clock conversion. There's no date library, and the
  calculations never read the system clock: "today" is always passed in (Principle VI).
- **The SharePoint Online Workbench retires on 2026-12-01**, and there is no dev tenant. That's
  why the harness exists. Testing the web part in SharePoint uses a page on a test site in the
  production tenant, which a human deploys (quickstart Q8 to Q10).

## R19. Secrets and configuration

**Decision**: the only secrets are the BrightHR client ID and client secret. They live in
**Azure Key Vault** and reach the Function as Key Vault references in app settings
(`@Microsoft.KeyVault(SecretUri=…)`), resolved through the Function's managed identity, which
has the *Key Vault Secrets User* role. Graph and storage use the managed identity, with no
secrets. The web part holds only non-secret properties: the API's base URL, the API's app ID
URI, and the no-access contact text. A build check scans the `.sppkg` and its JavaScript for
secret-like strings, BrightHR hostnames and fixture markers. Logs go to Application Insights
with a log filter that drops request bodies, and the code never logs names, reasons or raw
BrightHR payloads.

---

## Questions for BrightHR

Ask before switching to live data. Record the answers here and in CLAUDE.md.

| # | Question | Why it matters |
|---|---|---|
| B1 | What are the API rate limits (per minute/hour/day)? | Sync frequency and per-employee calls (R7). |
| B2 | Is there a sandbox or test company? | Contract tests without real employee data (Principle VII). |
| B3 | Can pending (unapproved) absence requests be listed? | FR-011 approved vs pending, FR-019 status. |
| B4 | Can an API app's credentials be limited to read-only, or to specific endpoints? | Principle I. |
| B5 | Can `to` on `/absences/v1/query` be in the future, and how far? Does the query return absences that *overlap* `from`–`to`, or only those that start in it? | Booked leave for future months; reconciliation (R11). |
| B6 | Does a future `employment.end` mean "serving notice"? Does a future `employment.start` appear for new starters? | Known leavers and starters (FR-014). |
| B7 | Do `isTerminated: true` queries return all past leavers with `employment.end`? For how long after they leave? | 12-month attrition from day one (R11). |
| B8 | What `displayName` values can each `$type` have (including public holiday, compassionate, unpaid)? | Absence type mapping (R13). |
| B9 | What `reason` values exist for sickness? Is there a pregnancy-related reason or flag? | Bradford Factor exclusion (R13). |
| B10 | Is there a department, team or working-pattern field anywhere in the API? | R10 and R12. |
| B11 | Is there an "updated since" filter for absences? | Lighter daytime syncs if rate limits are tight (R7). |
| B12 | Where is data processed and stored (region)? What are the API terms of use? | Data protection review, CLAUDE.md's service table. |

## Permissions and setup a human must do

Claude must not do any of these (CLAUDE.md, Hard constraints). Each is a step for IT or an
admin, listed in the order needed.

| # | What | Where | Notes |
|---|---|---|---|
| P1 | Create the access group (HR + Senior Leadership) | Microsoft 365 admin / Entra | The business decides who is in Senior Leadership. |
| P2 | Register **HR Dashboard API** with the `user_impersonation` scope and `Dashboard.Read` app role. Set assignment required = Yes, and assign the access group to the role | Entra ID | Group assignment needs Entra ID P1 (R4). |
| P3 | Create a resource group in UK South with a Function app (Flex Consumption, Node 22), a storage account, Application Insights and Key Vault (RBAC mode) | Azure | A subscription and owner must be agreed. |
| P4 | Turn on the Function app's system-assigned managed identity. Grant it *Key Vault Secrets User* on the vault and the storage roles that Flex Consumption needs | Azure | |
| P5 | Grant the managed identity the Graph **application** permissions `Sites.Selected` and `User.Read.All`, with admin consent | Entra ID | Done with PowerShell or the Graph API; managed identities have no portal consent page. |
| P6 | Create the "HR Dashboard Data" site, with named administrators only. Grant the managed identity `write` on that site via `Sites.Selected` | SharePoint admin | Then create the lists from [contracts/sharepoint-lists.md](contracts/sharepoint-lists.md) with the provisioning script that implementation provides. |
| P7 | Register a BrightHR API app in BrightHR API Management and put its client ID and secret in Key Vault | BrightHR admin + Azure | Only after the BrightHR questions are answered and live access is approved. |
| P8 | Upload the `.sppkg` to the app catalog and approve the web part's API permission request (`HR Dashboard API` → `user_impersonation`) | SharePoint admin center | |
| P9 | Create the dashboard page on a site shared with the access group only, and add the web part | SharePoint | |
| P10 | Set `BRIGHTHR_MODE=live` | Function app settings | The last step, by a human, after the contract tests pass. |

## Departures from the plan input

| Plan input said | Plan does | Why |
|---|---|---|
| Fluent UI and Fluent UI React Charting | Design kit + hand-built SVG charts | Principle III. Project owner confirmed, 2026-10-27 (R1). |
| Web part reads lists with PnPjs | Web part calls the Function API with `AadHttpClient` | Synced-data access rule, Principle II tests. Project owner confirmed, 2026-10-27 (R3). |
| Monthly aggregated metrics list | Figures worked out per request from stored records | Not needed once the Function serves the page (R6, R15). |
| Web part mock mode on BrightHR-shaped fixtures | Mock at the Function's BrightHR client, plus a harness-only client for UI work | Principle VII prefers mocking at the back end. The web part shows "Sample data" from the API's `dataMode` (R14). |
| Power Automate fallback on the same lists | Not planned | R16. |
| Approved vs pending leave | Approved only until BrightHR answers B3 | API limit. Project owner confirmed, 2026-10-27 (R9). |
