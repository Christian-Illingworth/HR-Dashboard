# Implementation Plan: HR Dashboard

**Branch**: `001-hr-dashboard` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-hr-dashboard/spec.md`, plus the plan input
recorded in [research.md](research.md#departures-from-the-plan-input).

## Summary

HR and Senior Leadership open a SharePoint page whose SPFx web part shows KPIs, four trend
charts and "Who's off in Sales", using BrightHR data. The web part is built with React and the
Consultiv design kit, inside a shadow root.

The data path has three parts:
- A TypeScript Azure Function syncs BrightHR on the clarified schedule. It reads only the
  allowed fields and uses credentials from Key Vault.
- The sync stores the records in SharePoint lists in a data site that only the Function and
  named administrators can open.
- The web part asks the Function for data with `AadHttpClient`. On each request the Function
  checks the caller's `Dashboard.Read` app role (held through the access group), works out the
  figures in a pure, test-first `core` package, and returns them.

There are two sample-data modes. On the back end, sample data replaces BrightHR at the
Function's client. In the web part, a `dataSource = sample` property runs the dashboard on
bundled synthetic data, so it can be demoed before the Function exists ([tasks.md](tasks.md),
milestone 1). A Vite harness lets the UI be built and tested without SharePoint.

The public BrightHR API sets three limits that shape this plan. It has a 90-day lookback, so
the dashboard builds its own history from the first sync. It lists approved absences only, so
there's no pending leave for now. It has no department field, so departments come from Entra
ID. Details are in research R9–R11.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS (Function and tooling). The web part
uses the TypeScript and React versions pinned by the SPFx release in use (research R18).

**Primary Dependencies**:
- SPFx (latest GA at implementation, probably 1.23) with React. `AadHttpClient` for API calls.
- Azure Functions v4 programming model (`@azure/functions`). `@azure/identity` for the managed
  identity. Plain `fetch` for BrightHR and Graph.
- `jose` (JWT validation).
- Vite (UI harness). PostCSS (shadow-root stylesheet build).
- Design kit CSS (`design-kit/`, read-only).
- No chart, UI-component or date library.

**Storage**: SharePoint Online lists in the "HR Dashboard Data" site, through Microsoft Graph
with `Sites.Selected` ([contracts/sharepoint-lists.md](contracts/sharepoint-lists.md)). An Azure
Storage queue in the Function's own storage account carries sync requests. Local development
uses JSON files in `.local-data/`.

**Testing**: Vitest (core, Function and UI with React Testing Library). Playwright +
`@axe-core/playwright` on the harness. Stylelint with a no-colour-literals rule on project CSS.
Contract tests against live BrightHR exist but are skipped unless a human runs them.

**Target Platform**:
- SharePoint Online pages, on desktop browsers and in the SharePoint mobile app (iOS and
  Android).
- Azure Functions Flex Consumption (Linux, UK South).

**Project Type**: web application. An SPFx client plus a serverless back end, sharing a pure
TypeScript calculation package.

**Performance Goals**:
- Dashboard data within 5 s on office broadband and 10 s on 4G mobile (SC-002).
- Warm API response under 1 s.
- A sync finishes in under 10 minutes.
- Web part bundle under 300 KB gzipped.

**Constraints**:
- No live BrightHR in development.
- BrightHR allows a 90-day lookback and one absence call per employee, and its rate limits are
  unknown.
- No secrets in the client.
- Only allow-listed fields are synced.
- Style isolation both ways.
- WCAG 2.1 AA.
- Data stays in the M365 and Azure tenant.

**Scale/Scope**: assumed under 250 employees and under 20 users (research R17; confirm with
HR). One page, 6 sections, 4 API operations.

All Technical Context unknowns are resolved in [research.md](research.md). The questions left
for BrightHR (B1–B12) don't block the build, because the design runs on mock data and isolates
each one. They do block switching to live data.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked against constitution v2.0.0.

| Principle | Pre-research (plan input as given) | Post-design (this plan) |
|---|---|---|
| **I. Security First** | ⚠️ PnPjs reading lists directly is not "only the project's own back end". | ✅ BrightHR is called only by the Function, through an allow-listed client (R9). Credentials are in Key Vault via managed identity (R19). Every API request has its Entra token and role checked in code (R4). The web part talks only to the Function (R3). Read-only is enforced in code, because BrightHR has no read-only credentials (R9, question B4). |
| **II. Data Protection by Design** | ⚠️ Authorization would rest on list permissions with no automated tests. | ✅ Sickness reasons go only to role holders, in the Sales list only (FR-006, M15). `authorize()` has unit tests (quickstart Q2). Sync is allow-listed, and `note` is never read (data-model §1). There's a draft data inventory (data-model §5). Small-group inference doesn't apply: every user is entitled to everything. Revisit if restricted access is added. |
| **III. SharePoint-Hosted, Consultiv-Branded** | ❌ Fluent UI and Fluent UI React Charting are forbidden. | ✅ Design kit only, with hand-built SVG charts (R1). Shadow-root isolation (R2). No `design-kit/` edits. A project stylesheet uses tokens only (Stylelint). Mobile app checks (Q9). The SPFx property pane is SharePoint's own UI, not the dashboard's. |
| **IV. Accessible** | — | ✅ Charts have focusable points, tooltips by keyboard, mouse and touch, table views, and patterns plus labels (R1). axe and manual checks (Q6). |
| **V. Honest Data** | — | ✅ Forecasts are hatched, dashed and labelled. Booked and to-date are labelled. Freshness is M16. History gaps are marked (D4, R11). The metric catalogue is data-model §4, moving to `docs/` in implementation. Mock data is labelled "Mock data" (R14). |
| **VI. Test-First Calculations** | ✅ The input already asked for unit-tested calculations. | ✅ Calculations are pure in `packages/core`, with "today" passed in. Expected values are worked out by hand in `fixtures/expected/`. Edge cases are listed per metric (Q1). |
| **VII. Mock-First Development** | ⚠️ The mock sat in the web part. | ✅ In `api` mode, mocking happens at the Function's BrightHR client, switched by configuration (`BRIGHTHR_MODE`, default `mock`), with the same shape and the documented API behaviour. Before the Function exists, the web part's `dataSource = sample` property (also configuration) runs the same calculations on the same BrightHR-shaped fixtures, labelled "Mock data". Contract tests are ready for live access (R14). |
| **VIII. Keep It Simple** | ⚠️ A Power Automate premium fallback and a per-filter metrics list. | ✅ Uses licensed Azure and M365 only. No chart or UI library. Figures are worked out per request instead of being stored (R15). The fallback is dropped (R16). New infrastructure is justified below. |
| **Security & Data Handling** | ⚠️ The access group could read the synced lists. | ✅ The data site is reachable only by the Function and named admins (R6). HTTPS throughout. Logs carry fixed failure codes and counts only (R7, R19). No writes to BrightHR. |

**Result**: the plan input failed Principle III and leaned on readings of Principle I, II and
the data-handling rules. The project owner resolved these on 2026-10-27 by choosing the design
kit and the Function API (research R1, R3). The design passes every principle after Phase 1.
The only entries left in Complexity Tracking are Principle VIII justifications for new
infrastructure.

## Project Structure

### Documentation (this feature)

```text
specs/001-hr-dashboard/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0: decisions R1–R19, BrightHR questions, human setup steps
├── data-model.md        # Phase 1: entities, metric catalogue (M01–M16), data inventory
├── quickstart.md        # Phase 1: validation scenarios Q1–Q10 and the release gate
├── contracts/
│   ├── dashboard-api.openapi.yaml   # the Function's API (what the web part calls)
│   ├── brighthr-consumed.md         # the BrightHR subset we call (what the mock copies)
│   └── sharepoint-lists.md          # storage schema in the data site
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks; not created here)
```

### Source Code (repository root)

```text
packages/
├── core/                        # Pure TypeScript. No I/O, no clock, no React.
│   ├── src/
│   │   ├── brighthr/            # DTO types and allow-list normaliser
│   │   ├── calendar/            # working days, bundled bank-holidays.json, Europe/London clock helpers
│   │   ├── absences/            # categories (D5), spans (D1), episodes (D2)
│   │   ├── window/              # month window, coverage, picker (D4)
│   │   ├── metrics/             # M01–M12, M15, M16; each file links to docs/metric-catalogue.md
│   │   ├── forecast/            # M13, M14
│   │   ├── sync/                # reconcile, retention, row builders (pure parts of the sync)
│   │   └── dashboard/           # buildDashboard(records, query, today, now) → DashboardResponse
│   └── test/                    # Vitest; one file per metric, cases from fixtures/expected
├── dashboard-ui/                # React + design kit. React is a peer dependency.
│   ├── src/
│   │   ├── App.tsx              # sections, filters, refresh, per-section states
│   │   ├── components/          # KpiRow, SalesList, Filters, FreshnessNotice, NoAccess, SectionState
│   │   ├── charts/              # BarChart (columns, stacks, line, tooltip, keyboard), model, patterns, Legend, ChartTable, ChartSection
│   │   ├── data/                # DashboardClient interface
│   │   └── styles/              # project.css (tokens only) + build-shadow-css (PostCSS)
│   ├── harness/                 # Vite dev harness and harness-only client (never in the web part)
│   ├── test/                    # Vitest + React Testing Library
│   └── e2e/                     # Playwright + axe
apps/
├── sync-function/               # Azure Functions v4, Node 22
│   ├── src/
│   │   ├── functions/           # syncSchedule, syncRun, dashboard, refresh
│   │   ├── auth/                # verifyToken (jose), authorize (pure)
│   │   ├── brighthr/            # allow-listed live client, MockBrightHrClient
│   │   ├── graph/               # Entra users lookup, Graph list access
│   │   ├── store/               # Store interface; SharePoint and file implementations
│   │   └── config.ts            # BRIGHTHR_MODE, STORE_MODE, ids; validates at start-up
│   └── test/                    # unit/, http/, contract/ (live; skipped unless a human runs it)
└── webpart/                     # SPFx solution, outside npm workspaces (R18)
    ├── src/webparts/hrDashboard/  # shadow-root mount, AadHttpClient DashboardClient, @font-face
    └── config/package-solution.json  # webApiPermissionRequests → HR Dashboard API
fixtures/
├── brighthr/                    # synthetic EmployeeDto pages and AbsenceDto pages per employee
├── entra/users.json             # synthetic users with departments
└── expected/                    # hand-worked expected values, one file per scenario
docs/
├── metric-catalogue.md          # from data-model §4; the living copy
└── data-inventory.md            # from data-model §5; the living copy
scripts/
├── provision-lists.ps1          # PnP PowerShell; a human runs it (research P6)
└── check-bundle.mjs             # bundle check for secrets, fixtures and the harness (Q8)
```

**Structure Decision**: npm workspaces for `packages/core`, `packages/dashboard-ui` and
`apps/sync-function`. The SPFx project stays outside them and uses the built `dashboard-ui`
(R18). `core` is shared by the Function (production) and the harness (development only).
Keeping it free of I/O is what makes the calculations testable (Principle VI).

## Spec follow-ups

All the follow-ups from the BrightHR API findings are now in the spec.

- **Resolved by `/speckit-clarify` on 2026-10-27**: the department source (Entra ID, FR-019),
  known leavers (a future end date, FR-014), the 90-day lookback (FR-016 and the "First months
  after launch" edge case), average headcount (FR-008), data administrators (FR-028) and the
  2-hourly sync fallback (FR-024).
- **Resolved after `/speckit-analyze` on 2026-10-27**:
  - pending leave shown as "not available" until BrightHR provides it (FR-011, FR-019; US3 and
    US5 scenario 2 blocked on B3);
  - calendar day counting, with part-timers over-counted as an accepted limit (Assumptions, D1);
  - department and role before the first sync (edge case, D3);
  - removal from the group taking effect within 90 minutes (FR-003, US2 scenario 4);
  - pregnancy-related reasons from settings (Assumptions, R13);
  - the half-day return date, the Upcoming range, the picker limits and the meaning of "sync
    hours" (FR-020, FR-019, FR-021, FR-024).

**Still open, waiting on BrightHR**: pending absences (B3), which would reopen FR-011 and FR-019.

## Complexity Tracking

> Each new infrastructure component, as Principle VIII requires. There are no deviations from
> Principles III–VII.

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Azure Function app (Flex Consumption) with its storage account, queue and Application Insights | The constitution requires a server-side back end for BrightHR calls and Entra-checked data access (Principle I). The storage account is required by Functions, and the queue lives in it. | Power Automate can't run unit-tested calculations or serve the page (R16). App Service and Container Apps cost more for no gain (R5). |
| Azure Key Vault | Principle I names a managed secret store for the BrightHR credentials. | App settings in plain text break Principle I. |
| SharePoint site "HR Dashboard Data" | Synced data must be readable only by the back end and named admins. A separate site gives site-level permissions and a `Sites.Selected` scope. | Lists on the dashboard site would need broken inheritance per list, which is easy to misconfigure. Azure Table storage would hide data and settings from administrators (R6). |
| Entra app registration "HR Dashboard API" with an app role | Puts access-group membership in the token so the Function can check it on every request (FR-004), and lets SPFx get tokens. | Easy Auth alone can't be tested. A `groups` claim breaks above 200 groups (R4). |
| Graph `User.Read.All` (application) | BrightHR has no department (R10). | An HR-maintained list is manual and drifts. The project owner chose Entra, 2026-10-27. |
| `jose` (free, open source) | Correct JWT signature and claim checks with keys generated in tests. | Hand-written JWT checks are a security risk. Easy Auth can't be tested. |

## Phase 2 preview (for `/speckit-tasks`)

Suggested order, so each user story can be tested on its own:

1. Set up the workspaces and tooling, and copy the catalogue and inventory into `docs/`.
2. `core`: calendar, D1–D6, then the metrics M01–M16 test-first.
3. Function: config, mock client, store, sync, then auth and `/dashboard` (US1, US2).
4. UI: KPI row, states, freshness, no-access screen (US1, US2, US4).
5. Sales list (US3).
6. Charts (US5, US6).
7. Filters (US7).
8. SPFx shell and shadow root, bundle check, provisioning script, then the release gate
   (quickstart).
