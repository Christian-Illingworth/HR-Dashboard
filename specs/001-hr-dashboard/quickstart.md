# Quickstart: validating the HR Dashboard (feature 001)

How to show that the feature works, from unit tests to the SharePoint mobile app. The commands
below exist, except the SPFx package step of `npm run build:webpart`, which waits for the web
part (tasks T008, T039, T040). CLAUDE.md's **Build & run** section lists them all.

Every scenario uses **sample data** and a fixed "today" of **2026-10-27**, unless it says
otherwise. Never point any of this at live BrightHR. Expected values come from
`fixtures/expected/*.md`, worked out by hand (Principle VI).

## Prerequisites

- Node.js 22 LTS and npm.
- Playwright browsers: `npx playwright install chromium webkit`.
- For Q7 only: Azure Functions Core Tools v4.
- For Q8–Q10 only: a human with the permissions in [research.md](research.md#permissions-and-setup-a-human-must-do)
  has done steps P1–P6, P8 and P9, with `BRIGHTHR_MODE` left at `mock`.

## Commands

| Command (repo root) | Does |
|---|---|
| `npm ci` | Installs the workspaces (`packages/*`, `apps/sync-function`). |
| `npm test` | Vitest in every workspace: metric, authorization, sync and component tests. |
| `npm run dev:harness` | Runs the UI harness on sample data at `http://localhost:5173/?today=2026-10-27`. |
| `npm run test:e2e` | Playwright + axe against the harness (desktop and phone sizes). |
| `npm run sync:mock` | Runs one sync against the BrightHR and Entra fixtures into `.local-data/` (`STORE_MODE=file`) and prints a summary of counts. |
| `npm run build:webpart` | Builds the SPFx package (`apps/webpart/sharepoint/solution/*.sppkg`) and runs the bundle check. |

## Scenarios

| # | Proves | Steps | Expected |
|---|---|---|---|
| Q1 | Metrics are right (US1, US5, US6; SC-003; Principle VI) | `npm test -w packages/core` | Every M01–M16 test passes, including each catalogue edge case. When a calculation is first added, its test was seen failing before the code existed (check the commit history). |
| Q2 | Authorization (US2; FR-004; SC-004; Principle II) | `npm test -w apps/sync-function -- auth` | A valid token with `Dashboard.Read` → 200. Without the role → 403 with `{ "error": "forbidden" }` and nothing else. Bad signature, wrong audience, wrong issuer, expired or missing → 401 with no data. The same for `/refresh`. A test finds no way to switch the check off. |
| Q3 | Read-only BrightHR (Principle I) | `npm test -w apps/sync-function -- live-client` | Only the three calls in [contracts/brighthr-consumed.md](contracts/brighthr-consumed.md) are allowed. A `PUT`, or any other path, throws before any network call. |
| Q4 | Sync and reconciliation (R7, R11) | `npm test -- sync` (core reconciliation and retention, and the Function's sync run), then `npm run sync:mock` | Cancelled absences are removed. Absences before the window are frozen. Retention deletes old records. Sickness reasons are kept only for Sales absences in range. `note` never appears in `.local-data/`. The summary shows `DataMode: Sample`. |
| Q5 | The UI on sample data (US1, US3–US7) | `npm run dev:harness`, open with `?today=2026-10-27` | KPI row matches `fixtures/expected/kpis.md`. Charts show Jul 2026 – Jan 2027 with October highlighted and "to date". Future sickness and leavers are hatched and labelled "Forecast". Pending shows "not available from BrightHR yet". "Mock data" is shown. The Sales list shows Today and Upcoming entries as in `fixtures/expected/sales.md`, including a sickness reason and "Not yet known" for an open-ended sickness. Picking May 2026 shows Feb–Aug 2026 as actuals, and the KPIs and Sales list don't change. A role filter of "Senior Energy Analyst" changes every section. |
| Q6 | States and accessibility (US4; FR-017, FR-018, FR-026; Principle IV; SC-007) | `npm run test:e2e` | axe reports no violations on every state: loading, no data yet, stale (each `staleReason`), section error, empty Sales list, Sales outside filter, no access. Charts are reachable by keyboard, with tooltips on focus and a working "Show table". At 360 px wide there is no horizontal page scroll. Also check by hand with NVDA or Narrator on Windows, and VoiceOver on iOS. |
| Q7 | The Function end to end, locally | `npm test -w apps/sync-function -- http`, which calls the HTTP handlers with test-signed tokens over a store filled by a mock sync. With Azure Functions Core Tools v4 and Azurite installed, `func start` in `apps/sync-function` (after `npm run build`) also runs the host locally | `/api/dashboard` returns a body that validates against [contracts/dashboard-api.openapi.yaml](contracts/dashboard-api.openapi.yaml). A second `/api/refresh` within 15 minutes → 429 with `nextAllowedAt`. |
| Q8 | No secrets in the bundle (quality gate) | `npm run build:webpart` | The bundle check passes: no BrightHR hostnames, no Key Vault references, no harness code, no secret-like strings. Synthetic fixtures appear only in the lazily loaded sample-data chunk. Look over the `.sppkg` contents list too. |
| Q9 | SharePoint and mobile (Principle III; FR-030) | A human deploys the `.sppkg` to a test page. Open it as an access-group member in a desktop browser, then in the SharePoint app on iOS and Android | Kit styling is intact and the SharePoint page around it is unchanged. "Mock data" is shown. Filters, the Today/Upcoming switch and chart tooltips work by touch. Log in as a user outside the group: they see the "no access" message, and the browser's network log shows no dashboard data. |
| Q10 | Speed (SC-002) | On the Q9 page, cold (after 20 idle minutes) and warm, on office broadband and on a phone on 4G | Data appears within 5 s on desktop and 10 s on mobile. If the cold start misses, set one always-ready instance (research R15) and record it in the plan's Complexity Tracking. |

## Release gate checklist

From the constitution's Development Workflow & Quality Gates section. Every item needs
evidence before the feature is called done:

- [ ] Q1 passes (metric tests), and the metric catalogue and data inventory are up to date.
- [ ] Q2 and Q3 pass, and a self-review is recorded: authorization tests pass, Q8 shows no
      secret in the bundle, and a 403 response contains no sickness reasons.
- [ ] Q6 axe scan is clean, and the keyboard and screen reader checks are done.
- [ ] Q9 is checked in the SharePoint mobile app.
- [ ] Changed views use only kit components and tokens. No hard-coded colours (the stylelint
      rule passes) and no `design-kit/` edits (`git diff --stat design-kit/` is empty).
- [ ] Every view shows "Last updated", and forecasts are labelled.
