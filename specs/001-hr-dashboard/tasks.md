---

description: "Task list for feature 001, the HR Dashboard"
---

# Tasks: HR Dashboard

**Input**: Design documents from `specs/001-hr-dashboard/`: [plan.md](plan.md), [spec.md](spec.md),
[research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/),
[quickstart.md](quickstart.md)

**Tests**: Required. Constitution Principle VI requires test-first calculations, and Principle II
requires automated authorization tests. Test tasks come before the code they cover. **Run each
new test and see it fail before writing the code.** Expected values are worked out by hand in
`fixtures/expected/*.md`, never by running the code under test. Tests fix "today" and never
read the system clock.

**Delivery order** (project owner, 2026-10-27). This replaces the spec's priority order:

1. **Milestone 1: mock-data web part** (Phases 1–9). The full dashboard on synthetic data,
   inside SharePoint, with no BrightHR or Azure. The web part's `dataSource` property is
   `sample`.
2. **Milestone 2: sync function** (Phases 10–11). The Function syncs the mock BrightHR into
   storage and serves the API. It's tested locally with test-signed tokens. Its token check
   ships here, because the constitution doesn't allow an unauthenticated back end, even on
   mock data.
3. **Milestone 3: live data and access control** (Phases 12–14). The access group, the app
   registration and the no-access experience. Then the live BrightHR and Graph clients,
   contract tests, the go-live runbook and the release gate.

User story phases keep the spec's IDs (US1–US7), so a story can span milestones. US4 has a UI
part in milestone 1 and a back-end part in milestone 2.

**Hard rules for every task** (CLAUDE.md, Hard constraints):
- Never call live BrightHR or point anything at it.
- No real employee data, anywhere.
- No secrets in code, config, docs, tests or logs.
- Never deploy, create Azure or Entra resources, or grant permissions. Runbook tasks write
  instructions for a human to follow.
- Never edit `design-kit/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on unfinished tasks).
- **[Story]**: The user story the task serves (US1–US7). Setup, foundational, milestone and
  polish phases have no story label.

## Path conventions

These follow [plan.md § Project Structure](plan.md#project-structure):
- `packages/core`: pure calculations.
- `packages/dashboard-ui`: React on the design kit, plus the Vite harness.
- `apps/sync-function`: Azure Functions.
- `apps/webpart`: SPFx, outside the npm workspaces.
- `fixtures/`, `docs/`, `scripts/`.

---

# Milestone 1: Mock-data web part

## Phase 1: Setup (shared infrastructure)

**Purpose**: Repository tooling and empty projects.

- [ ] T001 Create the root `package.json` with npm workspaces `["packages/core", "packages/dashboard-ui", "apps/sync-function"]`, `"engines": { "node": ">=22 <23" }`, and placeholder scripts `test`, `dev:harness`, `test:e2e`, `sync:mock`, `build:webpart`. Create `.nvmrc` (`22`) and `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, ES2022, module `NodeNext`) at the repo root.
- [ ] T002 [P] Extend `.gitignore` with `node_modules/`, `dist/`, `.local-data/`, `**/local.settings.json`, `apps/webpart/lib/`, `apps/webpart/temp/`, `apps/webpart/release/`, `apps/webpart/sharepoint/solution/`, `playwright-report/` and `test-results/`.
- [ ] T003 [P] Scaffold `packages/core`. Add `package.json` (name `@hrd/core`, `"type": "module"`, **no runtime dependencies**), `tsconfig.json` extending the base, `vitest.config.ts` and `src/index.ts`.
- [ ] T004 [P] Scaffold `packages/dashboard-ui`. Add `package.json` (name `@hrd/dashboard-ui`, `react` and `react-dom` as **peer** dependencies, Vite as the library build to `dist/`, Vitest with jsdom and React Testing Library), `tsconfig.json`, `vite.config.ts`, `src/index.ts`, `harness/index.html` and `harness/main.tsx`.
- [ ] T005 [P] Add ESLint (flat config, typescript-eslint) and Prettier at the root in `eslint.config.js` and `.prettierrc`. Add a `no-restricted-imports` rule banning `@fluentui/*`, `office-ui-fabric-react`, `bootstrap`, `recharts`, `chart.js`, `echarts`, `d3*` and `@pnp/*` everywhere. For `packages/core/src/**`, add a `no-restricted-syntax` rule banning `Date.now()`, argument-less `new Date()`, `fetch` and `node:` imports.
- [ ] T006 [P] Add Stylelint for `packages/dashboard-ui/src/styles/**/*.css` in `.stylelintrc.json`. It forbids colour literals: `color-no-hex: true`, `color-named: "never"`, and `function-disallowed-list` for `rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch` and `color`. Add an npm script `lint:css`.
- [ ] T007 [P] Add `vitest.workspace.ts` at the root, so `npm test` runs every workspace's tests.
- [ ] T008 Scaffold the SPFx solution in `apps/webpart` with the latest **GA** SharePoint Framework generator. Use a React web part named `HrDashboard`, and don't use Fluent UI components in its code. Keep it **outside** the npm workspaces, with its own `package-lock.json`. Record the SPFx, React, TypeScript and Node versions in `apps/webpart/README.md`, and set the `react`/`react-dom` peer range in `packages/dashboard-ui/package.json` to the React version SPFx ships (research R18).
- [ ] T009 [P] Write `fixtures/README.md` with the rules: synthetic data only, made-up names, the spec's roles (Energy Analyst, Senior Energy Analyst, Senior Pricing Specialist, Sales Team Manager), a Sales department, a fixed "today" of 2026-10-27, and expected values worked out by hand in `fixtures/expected/`.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Shared types, fixtures, calendar, absence rules, the dashboard skeleton, the UI
shell, the sample-data client and the SPFx shell. Every story needs these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Living documents

- [ ] T010 [P] Copy [data-model.md §4](data-model.md#4-metric-catalogue) to `docs/metric-catalogue.md`, with explicit anchors `<a id="d1">` … `<a id="d6">` and `<a id="m01">` … `<a id="m16">`. Copy [data-model.md §5](data-model.md#5-data-inventory-draft) to `docs/data-inventory.md`. Add a line to each saying this is the file to keep up to date (constitution Principles II and V).

### Types and fixtures

- [ ] T011 [P] Define the BrightHR DTO types exactly as in [contracts/brighthr-consumed.md](contracts/brighthr-consumed.md) in `packages/core/src/brighthr/types.ts`: `EmployeeDto`, an `AbsenceDto` union discriminated by `$type` (`Holiday | Sickness | Toil | Other` plus unknown strings), the boundary types `LocalDate | LocalDateTime | LocalDatePart{date, datePart: FirstHalf|SecondHalf|FullDay}`, sickness `duration` (`Days | Minutes`) and `reason.description`, and the paged response wrapper with `continuationToken`.
- [ ] T012 [P] Define the stored record types from [data-model.md §2](data-model.md#2-stored-entities) in `packages/core/src/records/types.ts`: `EmployeeRecord`, `EmployeeHistoryRow`, `AbsenceRecord`, `SicknessReasonRecord`, `SyncStatus` and `Settings`. Put these constraints in doc comments, word for word:
  - `jobTitle`: "Blank → 'Not set'".
  - `department`: "No match or blank → 'Not set'".
  - `givenName`/`familyName`: "Set only while `department` is in `SalesDepartments`; cleared otherwise".
  - `startPart`: `FullDay | FirstHalf | SecondHalf | Time`.
  - `endDate`: "`endDate` ≥ `startDate` when set".
  - `historyStartDate`: "Never moves after it is set".
  - `lastFailureCode`: "A fixed code (research R7), never personal data".
- [ ] T013 [P] Define the `DashboardResponse` types mirroring [contracts/dashboard-api.openapi.yaml](contracts/dashboard-api.openapi.yaml) in `packages/core/src/dashboard/types.ts`:
  - `Value.kind`: `actual | toDate | booked | known | forecast`.
  - `SectionStatus`: `ok | empty | error`.
  - `staleReason`: `lastAttemptFailed | olderThanThreshold | overnightMissed`.
  - `MonthBase.coverage`: `full | partial | none`.
- [ ] T014 Create the synthetic BrightHR fixtures:
  - `fixtures/brighthr/employees-current.json` and `fixtures/brighthr/employees-terminated.json`, as `EmployeeDto` pages of at most 100 with `continuationToken`.
  - `fixtures/brighthr/absences/<employeeId>.json`, as `AbsenceDto` pages.

  Include about 30 made-up employees, with absences from 2025-10-01 to 2027-01-31. Cover every edge case in data-model D1–D6 and M01–M15:
  - a morning-only annual leave today (2026-10-27);
  - open-ended sickness;
  - leave spanning Sep–Oct;
  - Friday plus Monday sickness (merged by D2);
  - leave over a bank holiday;
  - a same-day `LocalDateTime` absence;
  - sickness with `duration` in Days, and another in Minutes;
  - an unknown `$type`;
  - a pregnancy-related reason;
  - a public-holiday `displayName`;
  - a leaver whose end date is today;
  - a known leaver ending 2026-12-18;
  - a future starter;
  - Sales absences today, in 10 days and in 20 days;
  - a Sales absence ending with `FirstHalf`;
  - a `note` field on several absences, which must be dropped.
- [ ] T015 [P] Create `fixtures/entra/users.json` with made-up users (`mail`, `userPrincipalName`, `department`). Departments are Sales, Pricing, Analysis and Operations. Include one employee with no Entra match and one with a blank department.
- [ ] T016 [P] Create `fixtures/settings.json` with the defaults from [data-model.md §2.6](data-model.md#26-settings-hrd-settings-keyvalue-items-edited-by-named-administrators): `SalesDepartments: "Sales"` and `StandardDayHours: "7.5"`. Add `AbsenceTypeMap` lines `Bank holiday => publicHoliday`, `Compassionate leave => compassionate` and `Unpaid leave => unpaid`, and one `PregnancyRelatedReasons` line matching the fixture reason.
- [ ] T017 [P] Create `fixtures/sample-sync-status.json`: `lastSuccessAt` 2026-10-27T09:00:00Z, outcome `Succeeded`, `dataMode` `Sample`, `historyStartDate` 2025-10-01. Create `fixtures/sample-history.json` with one `HRD Employee History` row per employee per month from 2025-10 to 2026-10, including one employee who moved from Analysis to Sales in 2026-08. Also create `fixtures/launch-sync-status.json` with `historyStartDate` 2026-07-29, for the launch scenario.

### Calendar (tests first)

- [ ] T018 [P] Add the bundled gov.uk bank holidays (`england-and-wales` division) as `packages/core/src/calendar/bank-holidays.england-and-wales.json`. Record the source URL `https://www.gov.uk/bank-holidays.json` and the download date in `packages/core/src/calendar/README.md`.
- [ ] T019 [P] Write failing tests in `packages/core/test/calendar.test.ts` for:
  - `isWorkingDay` (weekends; 2026-12-25 and 2026-12-28, the Boxing Day substitute);
  - `workingDaysBetween` (inclusive);
  - `nextWorkingDay` (over a weekend and over Christmas);
  - `bankHolidaysCoverUntil`;
  - `toLondonDate`/`londonHour` across the BST to GMT change on 2026-10-25 01:00 UTC.
- [ ] T020 Implement `packages/core/src/calendar/workingDays.ts` and `packages/core/src/calendar/london.ts` (using `Intl.DateTimeFormat` with `Europe/London`) to pass T019. Neither may read the system clock.

### Absence rules D1, D2, D5 (tests first)

- [ ] T021 [P] Write failing tests in `packages/core/test/absences.test.ts` covering D5 and D1 from `docs/metric-catalogue.md`.
  - **D5**: `Sickness` → `sickness`. First matching `AbsenceTypeMap` line wins, ignoring case. Defaults: `Holiday` → `annualLeave`, `Toil` → `other`, `Other` → `other`, unknown → `other`.
  - **D1**: test each rule, quoted word for word:
    - "If `startPart` or `endPart` is `FirstHalf` or `SecondHalf`, that boundary day counts 0.5"
    - "If both parts are `Time` and the dates are the same, the day counts 0.5"
    - "durationMinutes ÷ (StandardDayHours × 60)"
    - "Each working day's fraction is scaled so the fractions add up to that total"
    - "For an open-ended absence the duration is ignored and the calendar count is used"
    - "Weekends and bank holidays count 0"
- [ ] T022 [P] Write failing tests for D2 in `packages/core/test/episodes.test.ts`. Quote: "two sickness absences of the same employee are merged when there is no working day between the end of one and the start of the next". Test a Friday plus Monday merge, a Friday plus Tuesday non-merge, merges across a bank holiday, and that `pregnancyRelated` is true if any part is.
- [ ] T023 Implement `packages/core/src/absences/category.ts`, `packages/core/src/absences/spans.ts` and `packages/core/src/absences/episodes.ts` to pass T021 and T022. Head each file with a `// Metric: docs/metric-catalogue.md#d1` (or `#d2`/`#d5`) comment.

### Window, membership and headcount D3, D4, D6 (tests first)

- [ ] T024 [P] Write failing tests in `packages/core/test/window.test.ts` for D4:
  - for `s` = 2026-10: window Jul 2026 – Jan 2027, `period` `actual | toDate | future`;
  - coverage `full | partial | none` against `historyStartDate`;
  - the picker offers months "from current − 9 to current where `s−3` is on or after `historyStartDate`'s month. The current month is always offered". With `historyStartDate` 2026-07-29, only 2026-10 is offered. With 2025-10-01, 2026-01 … 2026-10 are offered.
- [ ] T025 [P] Write failing tests in `packages/core/test/membership.test.ts` for D3 (current values for today and the future; a history row for a past month; the earliest row before the first row; current values with no rows; `departmentHistoryStartMonth`) and D6 (a leaver on their `endDate` is counted; a future starter isn't).
- [ ] T026 Implement `packages/core/src/window/window.ts`, `packages/core/src/window/coverage.ts`, `packages/core/src/window/picker.ts`, `packages/core/src/metrics/membership.ts` and `packages/core/src/metrics/headcountAt.ts` to pass T024 and T025.

### Records from BrightHR-shaped data (tests first)

- [ ] T027 [P] Write failing tests in `packages/core/test/records.test.ts` for the normaliser and records builder:
  - output never contains `note`, `reason.id`, `isCertified`, `estimatedReturn`, `isPaid`, `paidDuration`, `email`, `externalReference` or `payrollNumber`;
  - names are kept only for Sales-department employees;
  - an absence failing "`endDate` ≥ `startDate` when set" is skipped and counted in `warnings.skippedRecords`;
  - an employee with no start date is skipped and counted;
  - `departmentNotSet` counts unmatched and blank departments;
  - `pregnancyRelated` comes from `PregnancyRelatedReasons`;
  - `LocalDateTime` boundaries become part `Time` with the time dropped.
- [ ] T028 [P] Write failing tests in `packages/core/test/settings.test.ts` for parsing `HRD Settings` values: line splitting, trimming, `=>` mapping, unknown category names, `StandardDayHours` that isn't a positive number, and that any parse failure gives `SETTINGS_INVALID`.
- [ ] T029 Implement `packages/core/src/brighthr/normalise.ts` (allow-list), `packages/core/src/records/settings.ts` and `packages/core/src/sync/buildRecords.ts`. `buildRecords({employees, absencesByEmployee, entraUsers, settings, today})` returns `{employees, absences, warnings}`, matching email to Entra `mail` or `userPrincipalName` ignoring case. Pass T027 and T028.

### Dashboard skeleton

- [ ] T030 Write failing tests, then implement `buildDashboard({records, history, reasons, status, settings, query, today, now, syncIntervalHours})` in `packages/core/src/dashboard/buildDashboard.ts`, with tests in `packages/core/test/buildDashboard.test.ts`. It returns `meta` (`dataMode` from the status), `filters` (applied values and options: `"All"` first, departments A–Z including "Not set", roles, picker months newest first) and `coverage`. Every section is a placeholder `{status: "empty"}`. Each section builder runs in its own try/catch, so one throwing gives that section `{status: "error", message}` and leaves the others alone (FR-026). An unoffered `month`, `department` or `role` throws `BadRequestError`.

### UI foundation

- [ ] T031 [P] Write `packages/dashboard-ui/scripts/build-shadow-css.mjs` (PostCSS), per research R2. It reads `design-kit/css/tokens.css`, `design-kit/css/base.css` and `design-kit/css/components.css` (read-only) plus `packages/dashboard-ui/src/styles/project.css`, rewrites `:root` → `:host` and `html`/`body` → `.cu-root`, puts `:host { all: initial; }` first, and writes `packages/dashboard-ui/dist/shadow.css`. Add a test, `packages/dashboard-ui/test/shadow-css.test.ts`, asserting the output has no `:root`, `html` or `body` selectors and that the `design-kit/` files are unchanged (hash comparison).
- [ ] T032 [P] Create `packages/dashboard-ui/src/styles/project.css`, using kit tokens only (`var(--…)`), with no colour literals (Stylelint, T006). It holds the chart patterns, the selected-month band, the forecast hatch and dashed outline, the booked tint and the focus ring.
- [ ] T033 [P] Define the `DashboardClient` interface in `packages/dashboard-ui/src/data/DashboardClient.ts`:
  - `getDashboard(query)` → `{kind: "ok", data: DashboardResponse} | {kind: "forbidden"} | {kind: "unauthenticated"} | {kind: "badRequest"} | {kind: "unavailable"}`;
  - `requestRefresh()` → `{kind: "queued" | "alreadyRunning", nextAllowedAt} | {kind: "tooSoon", nextAllowedAt} | {kind: "forbidden"}`.
- [ ] T034 Implement `SampleDashboardClient` in `packages/dashboard-ui/src/data/SampleDashboardClient.ts`. It loads the fixtures and `@hrd/core` only through dynamic `import()`, so they are a separate chunk. It builds records with `buildRecords`, uses `fixtures/sample-sync-status.json` and `fixtures/sample-history.json`, and calls `buildDashboard` with `today` from its options (default `2026-10-27`). `meta.dataMode` is always `sample`. `requestRefresh` simulates the 15-minute limit in memory.
- [ ] T035 Build the app shell in `packages/dashboard-ui/src/App.tsx`, with `packages/dashboard-ui/src/components/SectionState.tsx` and `packages/dashboard-ui/src/components/SampleDataNotice.tsx`. It has a header slot, a filters slot and six independent section slots. Each section shows a loading skeleton (`.skeleton`, never blank or zeros), an empty state (`.empty-state`) or an error state (`.notice`) from its own `status`. A "Sample data" `.notice` shows on every view when `meta.dataMode` is `sample` (FR-029). The app uses kit classes only. Add the test `packages/dashboard-ui/test/App.test.tsx`.
- [ ] T036 Implement `mountDashboard(host, {client, noAccessContact, fontBaseUrl})` in `packages/dashboard-ui/src/mount.tsx`. It attaches an **open** shadow root to `host`, adds `dist/shadow.css` inside it, renders `<App>` inside `.cu-root`, and calls `ensureFonts(fontBaseUrl)`. That adds the Poppins `@font-face` rules (400–800) to `document.head` once. Menus, tooltips and modals must render inside the shadow root. Don't use `kit.js`.
- [ ] T037 Build the Vite harness in `packages/dashboard-ui/harness/main.tsx`. It mounts with `SampleDashboardClient`, reads `?today=YYYY-MM-DD`, and reads `?state=loading|noData|staleFailed|staleThreshold|staleOvernight|sectionError|forbidden|unavailable`, which a `StateSimulatingClient` wrapper in `packages/dashboard-ui/harness/StateSimulatingClient.ts` turns into simulated states. Wire the root script `dev:harness`. Harness code must never be imported from `src/`.
- [ ] T038 Set up Playwright and axe in `packages/dashboard-ui/e2e/playwright.config.ts`. Projects: desktop (1280×800) and phone (360×740, touch), in Chromium and WebKit, with the harness as `webServer`. Add `packages/dashboard-ui/e2e/a11y.spec.ts`, asserting `@axe-core/playwright` (WCAG 2.1 A/AA tags) reports no violations, and no horizontal scroll at 360 px. Wire the root script `test:e2e`.

### SPFx shell

- [ ] T039 Implement `apps/webpart/src/webparts/hrDashboard/HrDashboardWebPart.ts`. Properties: `dataSource` (`sample` | `api`, default `sample`), `sampleToday` (default `2026-10-27`), `apiBaseUrl`, `apiAppIdUri` and `noAccessContact`, all edited through the property pane. `render()` calls `mountDashboard` with `SampleDashboardClient` when `dataSource` is `sample`. Use `@hrd/dashboard-ui` through a `file:` dependency on `packages/dashboard-ui` (built `dist`). Copy `design-kit/fonts/*.woff2` and the logos into the web part's assets at build time (a build step, not by editing `design-kit/`), and pass their URL as `fontBaseUrl`.
- [ ] T040 Wire the root script `build:webpart`. It builds `packages/dashboard-ui` (library and `shadow.css`), then runs the SPFx production bundle and package in `apps/webpart`, producing `apps/webpart/sharepoint/solution/*.sppkg`.
- [ ] T041 Add a **Build & run** section to `CLAUDE.md` listing `npm ci`, `npm test`, `npm run dev:harness`, `npm run test:e2e` and `npm run build:webpart`, with the Node version. Update the status line to say implementation has started.

**Checkpoint**: `npm test` passes, and the harness shows the sample-data shell with six empty
sections.

---

## Phase 3: User Story 1, see the headline numbers at a glance (Priority: P1) 🎯 MVP

**Goal**: The KPI row (headcount, on leave today, off sick today, rolling 12-month attrition %,
average Bradford Factor) and "Last updated".

**Independent test**: open the harness with `?today=2026-10-27`. Each of the five numbers
matches `fixtures/expected/kpis.md`, and "Last updated" shows 27 Oct 2026 09:00 (UK time:
10:00 BST).

### Tests for User Story 1 ⚠️ write first, see them fail

- [ ] T042 [US1] Work out by hand the expected M01–M05 values at today 2026-10-27, with the workings, in `fixtures/expected/kpis.md`. Do this for: All; department Sales; role Senior Energy Analyst; and a group with no staff. For M04, list the 13 headcount dates (2026-10-27, 2026-09-27 … 2025-10-27).
- [ ] T043 [P] [US1] Write failing tests `packages/core/test/metrics/m01-headcount.test.ts`, `m02-on-leave-today.test.ts` and `m03-off-sick-today.test.ts`, using kpis.md and the M01–M03 edge cases: a leaver with `endDate` = today counts; a future starter doesn't; a morning-only leave counts; two overlapping records count once; public holidays don't count; today being a weekend or bank holiday gives 0; open-ended sickness counts; pregnancy-related sickness counts in M03.
- [ ] T044 [P] [US1] Write failing tests in `packages/core/test/metrics/m04-attrition-12m.test.ts`, using kpis.md and the M04 edge cases: H̄ = 0 → `noStaff`; someone who started and left inside P counts as a leaver; a future `endDate` isn't a leaver; today 2028-02-29 uses 2027-02-28.
- [ ] T045 [P] [US1] Write failing tests in `packages/core/test/metrics/m05-bradford.test.ts`, using kpis.md and the M05 edge cases: no employees → `noStaff`; a basis shorter than 364 days → `basisIsPartial` with `basisStartDate`; an episode starting before B counts in S, but only its days inside B count in D; open-ended counts up to today; a starter part-way through; pregnancy-related left out; a merged episode counts once.

### Implementation for User Story 1

- [ ] T046 [P] [US1] Implement M01–M03 in `packages/core/src/metrics/headcount.ts`, `packages/core/src/metrics/onLeaveToday.ts` and `packages/core/src/metrics/offSickToday.ts`. Head each with `// Metric: docs/metric-catalogue.md#m01` (and `#m02`, `#m03`).
- [ ] T047 [P] [US1] Implement M04 in `packages/core/src/metrics/attrition12m.ts` (`// Metric: …#m04`). Keep values unrounded inside the calculation, and round to 1 decimal place only in the response.
- [ ] T048 [P] [US1] Implement M05 in `packages/core/src/metrics/bradford.ts` (`// Metric: …#m05`).
- [ ] T049 [US1] Fill the `kpis` section in `packages/core/src/dashboard/buildDashboard.ts` from T046–T048. Extend `packages/core/test/buildDashboard.test.ts` to check that the section matches kpis.md for each filter.
- [ ] T050 [P] [US1] Build `KpiRow` in `packages/dashboard-ui/src/components/KpiRow.tsx` with `.kpi-strip` and `.kpi-mini`. It has five tiles with labels. An attrition or Bradford value with `noStaff` shows "No staff in this group". `basisIsPartial` shows "Based on data since <date>". Numbers use tabular figures. Add the test `packages/dashboard-ui/test/KpiRow.test.tsx`.
- [ ] T051 [P] [US1] Build `LastUpdated` in `packages/dashboard-ui/src/components/LastUpdated.tsx`. It shows "Last updated <d MMM yyyy, HH:mm>" in Europe/London time from `freshness.lastSuccessAt`, in the header on every view (FR-023). Add the test `packages/dashboard-ui/test/LastUpdated.test.tsx`.
- [ ] T052 [US1] Write the end-to-end test `packages/dashboard-ui/e2e/kpis.spec.ts`. With the harness at `?today=2026-10-27`, the KPI values equal kpis.md, "Last updated" is shown, and axe reports no violations.

**Checkpoint**: US1 works in the harness and in the SPFx web part in sample mode.

---

## Phase 4: User Story 3, see who is off in Sales (Priority: P2)

**Goal**: The "Who's off in Sales" list with Today and Upcoming.

**Independent test**: with sample data that has Sales absences today, in 10 days and in 20
days, "Today" shows only today's absences, "Upcoming" shows those from tomorrow to day 14, and
the 20-day absence isn't listed (spec US3).

### Tests for User Story 3 ⚠️

- [ ] T053 [US3] Work out by hand the expected Today and Upcoming entries at 2026-10-27 in `fixtures/expected/sales.md`: name, role, type, reason, start, end, return date, status and order. Include the "Not yet known" and `FirstHalf` return-date cases, `departmentsNotFound` with a settings line `Sales Ops`, and `outsideFilter` with department Pricing.
- [ ] T054 [P] [US3] Write failing tests in `packages/core/test/metrics/m15-sales.test.ts`, using sales.md:
  - Today vs Upcoming (tomorrow … today + 14) and the 20-day exclusion;
  - `publicHoliday` left out;
  - return date `nextWorkingDay(endDate)`, except "If `endPart` = `FirstHalf`, the return date is `endDate`";
  - open-ended → "Not yet known";
  - sort by start date, then family name;
  - role filter applied;
  - `departmentsNotFound`, `outsideFilter`, status `Approved` and `pendingAvailable: false`;
  - someone off today and tomorrow appears in both tabs.
- [ ] T055 [P] [US3] Write failing tests in `packages/core/test/sync/sickness-reasons.test.ts` for which reasons are kept. Quote: "A sickness absence of a current Sales-department employee that overlaps today to today + 14 days, or is open-ended". Reasons outside that rule are dropped.

### Implementation for User Story 3

- [ ] T056 [P] [US3] Implement M15 in `packages/core/src/metrics/salesAbsences.ts` (`// Metric: …#m15`).
- [ ] T057 [P] [US3] Implement `selectSicknessReasons(records, rawSicknessAbsences, settings, today)` in `packages/core/src/sync/sicknessReasons.ts`, and use it in `SampleDashboardClient` to build the sample reasons.
- [ ] T058 [US3] Fill the `salesAbsences` section in `packages/core/src/dashboard/buildDashboard.ts`. It always uses today, whatever month is picked (FR-022). Sickness reasons appear **only** in this section (FR-006). Add a test asserting no other section's JSON contains any fixture reason text.
- [ ] T059 [US3] Build `SalesList` in `packages/dashboard-ui/src/components/SalesList.tsx`:
  - a `.seg` Today/Upcoming switch (`aria-pressed`, keyboard operable);
  - a `.table` with columns Name, Role, Absence type (with the reason where present), Start, End, Return date and Status, and half-day parts shown as "(morning)"/"(afternoon)";
  - "Nobody in Sales is off" instead of an empty table;
  - "Sales is outside the current filter" when `outsideFilter`;
  - a `.notice` naming each `departmentsNotFound` entry;
  - the note "Pending: not available from BrightHR yet" while `pendingAvailable` is false;
  - stacked rows on narrow screens.

  Add the test `packages/dashboard-ui/test/SalesList.test.tsx`.
- [ ] T060 [US3] Write the end-to-end test `packages/dashboard-ui/e2e/sales.spec.ts`. The list matches sales.md, the switch works by keyboard and touch, and axe reports no violations.

**Checkpoint**: US1 and US3 both work on their own.

---

## Phase 5: User Story 4, know whether the data can be trusted (Priority: P2), UI part

**Goal**: Freshness messages, the refresh control and distinct per-section states, on sample
data. The back-end part is Phase 11.

**Independent test**: harness `?state=` variants show the right message for a successful sync,
a failed sync, data older than the threshold, a missed overnight run and "No data yet". The most
recent good data stays visible, and a second refresh within 15 minutes says when the next one is
available.

### Tests for User Story 4 ⚠️

- [ ] T061 [US4] Work out by hand the M16 cases in `fixtures/expected/freshness.md`:
  - Monday 07:00 after a good 02:00 run → fresh;
  - 02:10 while the overnight run is still going → judged against the previous night;
  - last attempt `Failed` → `lastAttemptFailed`;
  - 11:30 with the last success at 09:00 and an interval of 1 → `olderThanThreshold`;
  - the same with an interval of 2 → fresh, because the threshold is 3 hours;
  - 21:00 with no successful 02:00 run → `overnightMissed`;
  - `lastSuccessAt` null → `noDataYet`.
- [ ] T062 [P] [US4] Write failing tests in `packages/core/test/metrics/m16-freshness.test.ts`, using freshness.md. `syncIntervalHours` (1 or 2) is a parameter, never read from the environment.

### Implementation for User Story 4

- [ ] T063 [US4] Implement M16 in `packages/core/src/metrics/freshness.ts` (`// Metric: …#m16`). Fill `freshness` and `refresh.nextAllowedAt` in `packages/core/src/dashboard/buildDashboard.ts`.
- [ ] T064 [P] [US4] Build `FreshnessNotice` in `packages/dashboard-ui/src/components/FreshnessNotice.tsx` (`.notice`):
  - "No data yet" (with no zeros shown);
  - "The latest BrightHR update failed. Data last updated <time>.";
  - "Data may be out of date. Last updated <time>.";
  - "Last night's update didn't complete. Data last updated <time>.".

  Sections keep showing the most recent good data. Add the test `packages/dashboard-ui/test/FreshnessNotice.test.tsx`.
- [ ] T065 [P] [US4] Build `RefreshButton` in `packages/dashboard-ui/src/components/RefreshButton.tsx`. It calls `client.requestRefresh()`. On `tooSoon` it shows "Next refresh available at HH:mm". On `queued` it shows a busy `.pill.is-busy`, polls `getDashboard` every 15 s for up to 10 minutes until `freshness.lastSuccessAt` changes, then reloads every section (research R8). Add a test with fake timers, `packages/dashboard-ui/test/RefreshButton.test.tsx`.
- [ ] T066 [US4] Write the end-to-end test `packages/dashboard-ui/e2e/states.spec.ts`. It covers every harness `?state=` value plus a single-section error with the other sections still rendered (FR-026). Run axe on each state.

**Checkpoint**: US4's UI behaviour is demonstrable on sample data.

---

## Phase 6: User Story 5, see leave, sickness and absence trends (Priority: P3)

**Goal**: The leave, sickness and absence charts over the 7-month window, with actual, to-date,
booked and forecast styling, tooltips and table views.

**Independent test**: with today 2026-10-27, each chart shows Jul 2026 – Jan 2027 with October
highlighted and labelled "to date". Values match the expected files. Future sickness is hatched
and labelled "Forecast". Tooltips work by mouse, touch and keyboard, and "Show table" gives the
same values.

### Tests for User Story 5 ⚠️

- [ ] T067 [US5] Work out by hand the expected values for Jul 2026 – Jan 2027 at today 2026-10-27, in `fixtures/expected/leave.md` (M06), `fixtures/expected/sickness.md` (M07, M08) and `fixtures/expected/absence.md` (M09). Do the same for the sickness forecast (M13) in `fixtures/expected/forecast-sickness.md`, both with `historyStartDate` 2025-10-01 (12 basis months) and with 2026-07-29 (fewer than 3 full months → `notEnoughHistory`).
- [ ] T068 [P] [US5] Write failing tests in `packages/core/test/metrics/m06-leave.test.ts`. Cover: split across months; half days; bank holidays; `toDate` includes leave booked for the rest of October; future months booked; `pendingDays` is `{value: null}`; partial-coverage months are marked.
- [ ] T069 [P] [US5] Write failing tests in `packages/core/test/metrics/m07-sickness-days.test.ts` and `packages/core/test/metrics/m08-episodes.test.ts`. Cover: split; open-ended up to today; pregnancy-related **included**; an episode counted once, in its start month; merged absences counted once; future months come from M13.
- [ ] T070 [P] [US5] Write failing tests in `packages/core/test/metrics/m09-absence-by-type.test.ts`. Cover: the four categories; annual leave and public holidays left out; unknown `$type` → `other`; TOIL → `other`; future months have booked compassionate, unpaid and other, plus forecast sickness, each with its own `kind`.
- [ ] T071 [P] [US5] Write failing tests in `packages/core/test/forecast/m13-sickness.test.ts`. Quote: "basis months = the 12 months before the current month whose coverage (D4) is `full`". Cover: fewer than 3 → `null` + `notEnoughHistory`; `forecastBasisMonths` reported; group membership per basis month (D3); 1 decimal place.

### Implementation for User Story 5

- [ ] T072 [P] [US5] Implement M06–M09 in `packages/core/src/metrics/leaveDays.ts`, `packages/core/src/metrics/sicknessDays.ts`, `packages/core/src/metrics/sicknessEpisodes.ts` and `packages/core/src/metrics/absenceByType.ts`, each with its `// Metric:` link.
- [ ] T073 [P] [US5] Implement M13 in `packages/core/src/forecast/sickness.ts` (`// Metric: …#m13`).
- [ ] T074 [US5] Fill the `leave`, `sickness` and `absence` sections in `packages/core/src/dashboard/buildDashboard.ts`, with `period`, `isSelected`, `isCurrent` and `coverage` per month. Extend `packages/core/test/buildDashboard.test.ts`.
- [ ] T075 [P] [US5] Build the chart primitives in `packages/dashboard-ui/src/charts/`:
  - `scale.ts`: one zero-based scale per chart;
  - `ChartFrame.tsx`: axes, the selected-month band, a bold label for the selected month, and "to date" under the current month;
  - `patterns.tsx`: an SVG hatch for forecasts, a tint for booked values, and one pattern per series using `--series-*` in kit order with `.tone-*` classes;
  - `useRovingFocus.ts`: arrow keys move between data points, and Home/End jump;
  - `ChartTooltip.tsx`: shown on hover, tap and focus, with the exact value, the month, and "Actual", "To date", "Booked", "Known" or "Forecast" (FR-017).

  Add the test `packages/dashboard-ui/test/charts.test.tsx`.
- [ ] T076 [P] [US5] Build `ChartTable` in `packages/dashboard-ui/src/charts/ChartTable.tsx`: a "Show table" / "Show chart" toggle that renders a `.table` with the same values and kind labels, reachable by keyboard and screen reader (FR-018). Add the test `packages/dashboard-ui/test/ChartTable.test.tsx`.
- [ ] T077 [US5] Build the chart components in `packages/dashboard-ui/src/charts/`: `ColumnChart.tsx`, `StackedColumnChart.tsx`, and `ComboChart.tsx` (columns plus a row of value labels, with no second axis). Then build the sections:
  - `packages/dashboard-ui/src/components/LeaveChart.tsx`: approved days, with the note "Pending: not available from BrightHR yet".
  - `packages/dashboard-ui/src/components/SicknessChart.tsx`: day columns, with episodes as a labelled row under each month.
  - `packages/dashboard-ui/src/components/AbsenceChart.tsx`: stacked sickness, compassionate, unpaid and other, in that order, with a legend.

  All three show "No absence data before <date>" on `partial`/`none` months, and "Not enough history to forecast" when `notEnoughHistory`. Forecast columns are hatched with a dashed outline and labelled "Forecast" on the axis. Colour is never the only cue (FR-015, Principle IV).
- [ ] T078 [US5] Write the end-to-end test `packages/dashboard-ui/e2e/trends.spec.ts`. It checks the Jul 2026 – Jan 2027 axis, the October highlight and "to date", values against the expected files, "Forecast" labels, keyboard tooltips, the table view, the phone layout, and axe on each chart and table.

**Checkpoint**: US1, US3, US4 (UI) and US5 work on sample data.

---

## Phase 7: User Story 6, see staff attrition and its forecast (Priority: P3)

**Goal**: The attrition chart, with leavers (actual, known, forecast), starters (actual, known)
and the monthly rate %.

**Independent test**: December 2026 shows the known leaver who ends on 2026-12-18 apart from the
forecast. Forecast values are labelled "Forecast". Past monthly rates match
`fixtures/expected/attrition.md`.

### Tests for User Story 6 ⚠️

- [ ] T079 [US6] Work out by hand the expected M10–M12 and M14 values for Jul 2026 – Jan 2027 at 2026-10-27, in `fixtures/expected/attrition.md`. Include the known December leaver, a future starter, the current month's "to date" rate, and further leavers = max(0, avg − known).
- [ ] T080 [P] [US6] Write failing tests in `packages/core/test/metrics/m10-leavers.test.ts`, `m11-starters.test.ts` and `m12-monthly-attrition.test.ts`. Cover: `actual` vs `known`, with both in the current month; a leaver counted in headcount up to `endDate`; a denominator of 0 → `null` + `noStaff`; future rate `null`; the `toDate` rate uses D6(today).
- [ ] T081 [P] [US6] Write failing tests in `packages/core/test/forecast/m14-leavers.test.ts`. Quote: "basis months = the 12 months before the current month in which the group's headcount at the start of the month was more than 0". Cover: fewer than 3 → `null` + `notEnoughHistory`; known leavers above the average → 0; not limited by `historyStartDate`.

### Implementation for User Story 6

- [ ] T082 [P] [US6] Implement M10–M12 in `packages/core/src/metrics/leavers.ts`, `packages/core/src/metrics/starters.ts` and `packages/core/src/metrics/monthlyAttrition.ts`, each with its `// Metric:` link.
- [ ] T083 [P] [US6] Implement M14 in `packages/core/src/forecast/leavers.ts` (`// Metric: …#m14`).
- [ ] T084 [US6] Fill the `attrition` section in `packages/core/src/dashboard/buildDashboard.ts`. Extend `packages/core/test/buildDashboard.test.ts`.
- [ ] T085 [US6] Build `AttritionChart` in `packages/dashboard-ui/src/components/AttritionChart.tsx`, using the T075 primitives. Leavers and starters are side-by-side column groups: actual solid, known with a distinct pattern and the label "Known", forecast hatched with the label "Forecast". The rate % is a line with dot markers, shown for past months and the current month only. It has a legend and a table view. Add the test `packages/dashboard-ui/test/AttritionChart.test.tsx`.
- [ ] T086 [US6] Write the end-to-end test `packages/dashboard-ui/e2e/attrition.spec.ts`: values against attrition.md, the known December leaver apart from the forecast, labels, keyboard access and axe.

**Checkpoint**: every chart works on sample data.

---

## Phase 8: User Story 7, narrow the view with filters (Priority: P4)

**Goal**: Department, role and month filters that update every KPI, chart and list.

**Independent test**: role "Senior Energy Analyst" changes every section. Department "Pricing"
makes the Sales list say Sales is outside the filter. Picking May 2026 shows Feb–Aug 2026 as
actuals with May highlighted, while the today KPIs and the Sales list stay the same.

### Tests for User Story 7 ⚠️

- [ ] T087 [US7] Work out by hand the expected values for role Senior Energy Analyst, department Pricing, month 2026-05, and the employee who moved from Analysis to Sales in 2026-08 (past months under Analysis, current under Sales), in `fixtures/expected/filters.md`.
- [ ] T088 [P] [US7] Write failing tests in `packages/core/test/filters.test.ts`, using filters.md. Every section respects department and role (D3 for past months). Month 2026-05 gives a Feb–Aug window, all `actual`, with no forecasts (FR-021). Today's KPIs and the Sales list don't change with the month (FR-022). An unoffered option gives `BadRequestError`.

### Implementation for User Story 7

- [ ] T089 [US7] Apply the department, role and month query throughout `packages/core/src/dashboard/buildDashboard.ts`, so T088 passes.
- [ ] T090 [US7] Build `Filters` in `packages/dashboard-ui/src/components/Filters.tsx`. It has three `.select-trigger` + `.menu` dropdowns (Department, Role, Month), rebuilt in React with a listbox pattern: Enter, Space and the arrow keys open and move, Escape closes, focus returns to the trigger, and `aria-expanded` and `aria-activedescendant` are set. Use `.is-filtered` when not "All". Show the note "Departments and roles before <month> use the earliest values known" when relevant. Keep the previous data visible while the new data loads. Add the test `packages/dashboard-ui/test/Filters.test.tsx`.
- [ ] T091 [US7] Write the end-to-end test `packages/dashboard-ui/e2e/filters.spec.ts`: the three filter scenarios above, keyboard-only use, the phone layout and axe.

**Checkpoint**: the whole dashboard works on sample data in the harness.

---

## Phase 9: Milestone 1 wrap-up (sample-data web part demo)

**Purpose**: Package the sample-data web part for a demo in SharePoint, and record the checks.

- [ ] T092 Write `scripts/check-bundle.mjs` and wire it into `build:webpart`. It scans the `.sppkg` and the SPFx release JavaScript and **fails** on: `api.bright.hr`, `login.brighthr.com`, `@Microsoft.KeyVault`, `client_secret`, strings that look like secrets (long base64 or hex blobs next to `secret`/`key`/`password`), or `StateSimulatingClient`/`harness`. It checks that the fixtures appear **only** in the lazily loaded sample-data chunk, not in the main web part bundle.
- [ ] T093 [P] Write the demo runbook `docs/runbooks/demo-sample-webpart.md`, for a human to follow. Build the package, then upload the `.sppkg` to the app catalog (a SharePoint admin). Add the web part to a test page with `dataSource = sample`, and check the "Sample data" label. It says no BrightHR, Azure or Entra setup is needed.
- [ ] T094 [P] Create `docs/checks/manual-checks.md` from quickstart Q6 and Q9. It has rows for: keyboard-only, NVDA or Narrator on Windows, VoiceOver on iOS, the SharePoint app on iOS and Android, and the SharePoint page's own styling unchanged. Each row has columns for date, tester and result, for a human to fill in after the demo deployment.
- [ ] T095 Run `npm test`, `npm run lint:css`, `npm run test:e2e` and `npm run build:webpart`. Fix any failures. Update `CLAUDE.md` (status: milestone 1 complete; Build & run) and `docs/metric-catalogue.md` for any rule clarified during implementation.

**Checkpoint (Milestone 1)**: the sample-data web part can be demoed in SharePoint without
BrightHR or Azure.

---

# Milestone 2: Sync function

## Phase 10: Back-end foundation (sync and API on mock BrightHR)

**Purpose**: The Azure Function that syncs the mock BrightHR into storage and serves the API.
Everything is tested locally. **Not deployed until Milestone 3.**

**⚠️ CRITICAL**: The token check (T106–T108) is part of this phase. Constitution Principle I
doesn't allow an unauthenticated back end, even on mock data, and there is no switch to turn
it off.

- [ ] T096 Scaffold `apps/sync-function` (Azure Functions v4 programming model, Node 22, TypeScript): `package.json` (`@azure/functions` 4.x, `@azure/identity`, `jose`, `ajv` as a dev dependency), `host.json`, `tsconfig.json`, `src/index.ts` and `local.settings.example.json`. The example holds non-secret placeholders only: `BRIGHTHR_MODE=mock`, `STORE_MODE=file`, `SYNC_DAYTIME_INTERVAL_HOURS=1`, `AzureWebJobsStorage=UseDevelopmentStorage=true`. `local.settings.json` stays gitignored.
- [ ] T097 Write failing tests, then implement `loadConfig(env)` in `apps/sync-function/src/config.ts`, with tests in `apps/sync-function/test/unit/config.test.ts`:
  - `BRIGHTHR_MODE` is `mock` (default when unset) or `live`;
  - `STORE_MODE` is `file` or `sharepoint`;
  - `SYNC_DAYTIME_INTERVAL_HOURS` is `1` (default) or `2`;
  - `TENANT_ID`, `API_AUDIENCE`, `DATA_SITE_ID` and `LOCAL_DATA_DIR` are read as given;
  - `BRIGHTHR_CLIENT_ID`/`BRIGHTHR_CLIENT_SECRET` are required only when `live`;
  - an unknown value fails start-up;
  - config values are never logged, and there is **no** auth-disable setting.
- [ ] T098 [P] Write failing tests, then implement `apps/sync-function/src/log.ts`, with tests in `apps/sync-function/test/unit/log.test.ts`. Its typed logger accepts only fixed event names, failure codes (`BRIGHTHR_AUTH`, `BRIGHTHR_RATE_LIMIT`, `BRIGHTHR_UNAVAILABLE`, `GRAPH_WRITE`, `STORE_SCHEMA`, `SETTINGS_INVALID`, `UNKNOWN`) and numeric counts. It has no free-text or object parameters, so names, reasons and payloads can't be logged.
- [ ] T099 Define the `BrightHrClient` interface (`queryEmployees({isTerminated, continuationToken})`, `queryAbsences({employeeId, from, to, continuationToken})`) in `apps/sync-function/src/brighthr/BrightHrClient.ts`. Write failing tests, then implement `MockBrightHrClient` in `apps/sync-function/src/brighthr/mockClient.ts`, with tests in `apps/sync-function/test/unit/mock-client.test.ts`. It serves `fixtures/brighthr/` and copies the documented behaviour in [contracts/brighthr-consumed.md](contracts/brighthr-consumed.md): paging with `pageSize` ≤ 100, a 400 for a missing `employeeId`, a 400 when `from` is more than 90 days before today (UTC), defaults of today, and approved absences only. "Today" comes from an injected clock.
- [ ] T100 [P] Define the `DirectoryClient` interface (`listUsers()` → `{mail, userPrincipalName, department}[]`) in `apps/sync-function/src/graph/DirectoryClient.ts`. Implement `MockDirectoryClient` in `apps/sync-function/src/graph/mockDirectory.ts`, serving `fixtures/entra/users.json`.
- [ ] T101 Define the `Store` interface in `apps/sync-function/src/store/Store.ts`. Methods: `readAll()`, `upsertEmployees`/`upsertAbsences`/`upsertHistory`/`replaceReasons` (each skips items whose `contentHash` is unchanged), `delete…`, `getStatus()` and `putStatus(status, etag)` (throws `PreconditionFailed` on an ETag mismatch), and `getSettings()`. Write failing tests, then implement `FileStore` in `apps/sync-function/src/store/fileStore.ts` (one JSON file per list under `LOCAL_DATA_DIR`, default `.local-data/`), with tests in `apps/sync-function/test/unit/file-store.test.ts`.
- [ ] T102 [P] Write failing tests in `packages/core/test/sync/reconcile.test.ts` and `packages/core/test/sync/retention.test.ts`, then implement `packages/core/src/sync/reconcile.ts`, `packages/core/src/sync/retention.ts` and `packages/core/src/sync/history.ts` (research R11, data-model §2 state transitions). Test these rules, quoted word for word:
  - "Stored absences for that employee that overlap the window but weren't returned are deleted";
  - "Absences that end before the window are frozen";
  - "deleted when `endDate` is more than 13 months before today. Open-ended records are kept";
  - leavers are "deleted 13 months after `endDate`, along with their history rows";
  - history "rows for months more than 13 months before the current month are deleted";
  - one history row per employee per month, upserted during the month and frozen afterwards;
  - `historyStartDate` is "First successful sync's date − 90 days" and "Never moves after it is set".
- [ ] T103 [P] Write failing tests in `packages/core/test/calendar/schedule.test.ts`, then implement `shouldSync(nowUtc, intervalHours)` in `packages/core/src/calendar/schedule.ts` (research R7):
  - working days at London hours 07–19 for interval 1, or 07, 09 … 19 for interval 2;
  - 02 every day;
  - not on bank holidays in the daytime;
  - correct on both sides of the BST change.
- [ ] T104 Write failing tests, then implement `runSync({brightHr, directory, store, clock, config})` in `apps/sync-function/src/sync/runSync.ts`, with tests in `apps/sync-function/test/unit/run-sync.test.ts` using `MockBrightHrClient`, `MockDirectoryClient` and `FileStore`:
  - **Lock**: set `RunningSince` with ETag `If-Match`. A lock older than 30 minutes counts as stale and is taken over. A fresh lock means the run is dropped.
  - **Steps 1–6 of research R7**: settings; current and terminated employees; Entra users; absences per employee with `from` = today − 90 days and `to` = the last day of the month 3 months ahead, at most 4 at once; reconcile, retention and reasons; status.
  - **Outcome**: `Succeeded`/`Failed`, `lastFailureCode`, `warnings` counts, `dataMode` `Sample`.
  - **Failure**: on any failure, the last good data is kept.
  - **No `note`**: assert `note` never reaches the store.
- [ ] T105 Write `apps/sync-function/src/functions/syncRun.ts` (Storage queue trigger on `sync-requests`, calling `runSync`) and `apps/sync-function/src/functions/syncSchedule.ts` (timer `0 0 * * * *` UTC; queues a message when `shouldSync` is true). Write `apps/sync-function/src/composition.ts`, which picks the mock or live clients and the file or SharePoint store from config. Only the mock and file options exist so far; the live ones throw "not available until Milestone 3".
- [ ] T106 Write failing tests in `apps/sync-function/test/unit/auth.test.ts` (quickstart Q2), using RSA keys generated in the test and an injected JWKS. Valid token with `scp` containing `user_impersonation` and `roles` containing `Dashboard.Read` → allowed. Each of these → `unauthenticated`: missing token, bad signature, wrong `aud`, wrong `iss` (tenant), expired, missing `scp`. A valid token without `Dashboard.Read` → `forbidden`. Also assert there is no code path, config value or header that skips the check.
- [ ] T107 Implement `verifyToken(authorizationHeader, {tenantId, audience, jwks})` with `jose` in `apps/sync-function/src/auth/verifyToken.ts`, and the pure `authorize(claims)` in `apps/sync-function/src/auth/authorize.ts`, so T106 passes. In production the JWKS is `https://login.microsoftonline.com/{TENANT_ID}/discovery/v2.0/keys`, cached by `jose`'s remote key set.
- [ ] T108 Write failing tests in `apps/sync-function/test/http/dashboard.test.ts`, then implement the HTTP GET function `/api/dashboard` in `apps/sync-function/src/functions/dashboard.ts`:
  - Auth first. 401 `{error: "unauthenticated"}` and 403 `{error: "forbidden"}` carry **no other body data**.
  - Load the records through an in-memory cache keyed by `HRD Sync Status.LastSuccessAt`.
  - Call `buildDashboard` with today and now in Europe/London and `syncIntervalHours` from config.
  - Return 400 `{error: "badRequest"}` for an unoffered query, and 503 `{error: "unavailable"}` when the store can't be read.
  - Validate every 200 body against [contracts/dashboard-api.openapi.yaml](contracts/dashboard-api.openapi.yaml) with `ajv`.
- [ ] T109 Add the root script `sync:mock` (`apps/sync-function/scripts/sync-mock.ts`). It runs `runSync` once with the mock clients and `FileStore` into `.local-data/` and prints the counts only. It also takes a `--seed-history` option that seeds `.local-data/` from `fixtures/sample-history.json` and a full year of fixture absences (with `historyStartDate` 2025-10-01), so the local API shows populated charts. Document it in `apps/sync-function/README.md`.
- [ ] T110 Write failing tests in `apps/sync-function/test/unit/sharepoint-store.test.ts` with mocked `fetch` (no network), then implement `SharePointStore` in `apps/sync-function/src/store/sharepointStore.ts`, per [contracts/sharepoint-lists.md](contracts/sharepoint-lists.md):
  - Graph calls use a managed-identity token (`@azure/identity` `ManagedIdentityCredential`, scope `https://graph.microsoft.com/.default`) against site `DATA_SITE_ID`.
  - Reads are paged with `$select` of the contract's columns. Writes use JSON batches of at most 20, and 429 and 503 are retried with `Retry-After`.
  - Status writes use an ETag with `If-Match`, and a 412 becomes `PreconditionFailed`.
  - A start-up schema check raises `STORE_SCHEMA` if a list or column is missing. The store never creates or alters lists.
- [ ] T111 [P] Write `scripts/provision-lists.ps1` (PnP PowerShell), for a **human** to run against the data site. It creates every list and column in [contracts/sharepoint-lists.md](contracts/sharepoint-lists.md) with the "Idx" indexes and enforced unique `Title` values. Versioning is on for `HRD Settings` only. It seeds the default settings items (`SalesDepartments: Sales`, `StandardDayHours: 7.5`, empty `AbsenceTypeMap` and `PregnancyRelatedReasons`), and creates the single `HRD Sync Status` item with `Title` `status`. The script must not grant permissions; it prints the `Sites.Selected` steps for an admin instead.
- [ ] T112 Implement `ApiDashboardClient` in `apps/webpart/src/webparts/hrDashboard/ApiDashboardClient.ts`. It uses SPFx `AadHttpClient` for `apiAppIdUri` to call `GET {apiBaseUrl}/api/dashboard` and `POST {apiBaseUrl}/api/refresh`, and maps the responses to the `DashboardClient` results (T033). Wire `HrDashboardWebPart.ts` to use it when `dataSource` is `api`. Add `webApiPermissionRequests` for `HR Dashboard API` / `user_impersonation` to `apps/webpart/config/package-solution.json`. The error handling for access control is T121.

**Checkpoint**: `npm run sync:mock` fills `.local-data/`, `func start` serves
`/api/dashboard` to the test-signed tokens in the HTTP tests, and every test passes.

---

## Phase 11: User Story 4, the trust and refresh back end (Priority: P2)

**Goal**: A real refresh with a shared 15-minute limit, and freshness from the stored sync status.

**Independent test**: a second `POST /api/refresh` within 15 minutes gets 429 with
`nextAllowedAt` and `Retry-After`. After a mock sync completes, `GET /api/dashboard` shows the new
`lastSuccessAt`. With `SYNC_DAYTIME_INTERVAL_HOURS=2`, the stale threshold is 3 hours.

### Tests for User Story 4 ⚠️

- [ ] T113 [P] [US4] Write failing tests in `apps/sync-function/test/http/refresh.test.ts` for `POST /api/refresh`:
  - 401 and 403 with no data;
  - 202 `{status: "queued", nextAllowedAt}`, with a message queued;
  - 202 `{status: "alreadyRunning"}` while a lock is held;
  - 429 with `Retry-After` and `nextAllowedAt` within 15 minutes;
  - two refreshes at the same moment: only one wins (ETag 412 → re-read → 429).
- [ ] T114 [P] [US4] Write a failing test in `apps/sync-function/test/http/freshness.test.ts`. Run `runSync` with a failing mock, and `GET /api/dashboard` shows `lastAttemptFailed` with the previous data. With `SYNC_DAYTIME_INTERVAL_HOURS=2`, a success 2.5 hours old is fresh during sync hours.

### Implementation for User Story 4

- [ ] T115 [US4] Implement the HTTP POST function `/api/refresh` in `apps/sync-function/src/functions/refresh.ts`, per research R8, so T113 passes.
- [ ] T116 [US4] Make T114 pass. Check that `apps/sync-function/src/functions/dashboard.ts` passes `syncIntervalHours` through, and that the cache resets when `LastSuccessAt` changes.
- [ ] T117 [US4] Write the runbook `docs/runbooks/deploy-function.md`, for a **human** to follow. It covers research steps P3 (resource group, Function app on Flex Consumption with Node 22 in UK South, storage account, Application Insights, Key Vault in RBAC mode), P4 (managed identity and roles), P5 (`Sites.Selected` only, for now) and P6 (data site with the two named data administrators, `scripts/provision-lists.ps1`, the `Sites.Selected` write grant). It also covers the app settings (`BRIGHTHR_MODE=mock`, `STORE_MODE=sharepoint`, `DATA_SITE_ID`, `TENANT_ID`, `API_AUDIENCE`) and the code deployment. It must say that the web part stays on `dataSource = sample` until Phase 12 is done.
- [ ] T118 [US4] Update `CLAUDE.md` (status: milestone 2 complete; Build & run gets `func start`, `npm run sync:mock` and `--seed-history`) and `apps/sync-function/README.md`.

**Checkpoint (Milestone 2)**: the sync function works end to end locally on mock BrightHR,
and a human can deploy it in mock mode.

---

# Milestone 3: Live data and access control

## Phase 12: User Story 2, only HR and Senior Leadership can see the dashboard (Priority: P1)

**Goal**: Access controlled by the single access group, from the page to the API. Anyone else
sees a no-access message and receives no data.

**Independent test** (quickstart Q2 and Q9, SC-004): a member of the access group sees the
whole dashboard, including sickness reasons. A user outside it sees the no-access message with
the contact text, and the browser's network log shows no dashboard data. A direct
`GET /api/dashboard` with that user's token returns 403 with no data. After someone is removed
from the group, their next token is refused.

### Tests for User Story 2 ⚠️

- [ ] T119 [P] [US2] Write a failing test in `apps/sync-function/test/http/no-leak.test.ts`. For 401 and 403 on both endpoints, the response body equals the exact `Error` schema, and contains none of the fixture names, sickness reason strings, department names or numbers from the dataset (SC-004).
- [ ] T120 [P] [US2] Write failing tests in `apps/webpart/src/webparts/hrDashboard/ApiDashboardClient.test.ts`. A token acquisition error containing `AADSTS50105` or `AADSTS501051` → `forbidden`. HTTP 403 → `forbidden`. HTTP 401 → one retry with a fresh token, then `unauthenticated`. 503 → `unavailable`. Network failure → `unavailable`.

### Implementation for User Story 2

- [ ] T121 [US2] Make T120 pass in `apps/webpart/src/webparts/hrDashboard/ApiDashboardClient.ts`.
- [ ] T122 [P] [US2] Build `NoAccess` in `packages/dashboard-ui/src/components/NoAccess.tsx`, and render it from `App.tsx` when the client returns `forbidden`. It says "You don't have access to the HR Dashboard" and shows the `noAccessContact` text (FR-005). It renders no sections and makes no further data requests. On `unauthenticated` it shows a sign-in problem message. Add the test `packages/dashboard-ui/test/NoAccess.test.tsx`, plus the harness `?state=forbidden` axe check in `packages/dashboard-ui/e2e/states.spec.ts`.
- [ ] T123 [US2] Write the runbook `docs/runbooks/access-control.md`, for a **human** to follow. It covers:
  - **P1**: create the access group (HR and Senior Leadership; the business decides who is in Senior Leadership).
  - **Entra ID P1**: check the licence, which group assignment needs.
  - **P2**: register "HR Dashboard API", expose `user_impersonation`, add the `Dashboard.Read` app role, set assignment required = Yes, and assign the access group. Set `API_AUDIENCE` and the web part's `apiAppIdUri`.
  - **P8**: approve the web part's API permission in the SharePoint admin center.
  - **P9**: share the dashboard page with the access group only, and switch the web part to `dataSource = api`.
  - **Checks**: a member sees data; a non-member sees no access with no data in the network log; after a removal, the next token is refused once the old token expires (tokens last up to about 60–90 minutes).
  - **Fallback**: the `groups` claim, if Entra ID P1 isn't available (research R4).
- [ ] T124 [US2] Create the self-review record `docs/reviews/authorization-self-review.md`, from the constitution's quality gates. It has items for: the authorization tests pass (T106, T113, T119, T120); the bundle check shows no secret (T092); a 403 response contains no sickness reasons (T119). There are fields for date, reviewer and second reviewer (optional), for a human to complete.

**Checkpoint**: US2 is in place in code. A human completes the access-control runbook, and the
web part runs on `dataSource = api` against the Function in mock mode.

---

## Phase 13: Live BrightHR and Entra data

**Purpose**: The live clients, the contract tests and the go-live runbook. **No task here may
run anything against live BrightHR.** Only a human runs the contract tests and makes the switch.

- [ ] T125 Write failing tests in `apps/sync-function/test/unit/live-client.test.ts`, using mocked `fetch` only (quickstart Q3):
  - **Allow-list**: only `POST https://login.brighthr.com/connect/token`, `POST https://api.bright.hr/employees/v1/query` and `POST https://api.bright.hr/absences/v1/query` are allowed. Any other method or path, including `PUT /employees/v1/{id}/external-reference`, throws **before** any `fetch` call.
  - **Token**: cached until 60 seconds before `expires_in`.
  - **Errors**: 401 → `BRIGHTHR_AUTH`. 429 → wait `Retry-After`, or exponential backoff with jitter, for at most 5 tries, then `BRIGHTHR_RATE_LIMIT`. 5xx → retried the same way, then `BRIGHTHR_UNAVAILABLE`.
- [ ] T126 Implement `LiveBrightHrClient` in `apps/sync-function/src/brighthr/liveClient.ts` so T125 passes. Credentials come only from the config (`BRIGHTHR_CLIENT_ID`/`BRIGHTHR_CLIENT_SECRET`, filled from Key Vault references) and never appear in a log or error message.
- [ ] T127 [P] Write failing tests in `apps/sync-function/test/unit/graph-directory.test.ts` with mocked `fetch`, then implement `GraphDirectoryClient` in `apps/sync-function/src/graph/graphDirectory.ts`. It calls `GET https://graph.microsoft.com/v1.0/users?$select=mail,userPrincipalName,department` with paging and a managed-identity token, and needs `User.Read.All`.
- [ ] T128 Wire `BRIGHTHR_MODE=live` in `apps/sync-function/src/composition.ts` to `LiveBrightHrClient` + `GraphDirectoryClient`, with `dataMode` `Live`. Start-up fails if the live settings are missing. Extend `apps/sync-function/test/unit/config.test.ts`.
- [ ] T129 Write the contract tests `apps/sync-function/test/contract/brighthr.contract.test.ts`. They are **skipped unless** `RUN_LIVE_CONTRACT=1` is set by a human, and they read nothing from the repo except the fixtures. They compare the shape of live responses (field names, types and the `$type` discriminators) with `fixtures/brighthr/`, and print differences only, never values (Principle VII).
- [ ] T130 Write the runbook `docs/runbooks/go-live.md`, for a **human** to follow:
  1. Get BrightHR's answers to B1–B12, and record them in `specs/001-hr-dashboard/research.md` and `CLAUDE.md`.
  2. If the rate limits need it, set `SYNC_DAYTIME_INTERVAL_HOURS=2`.
  3. **P5**: grant `User.Read.All`.
  4. **P7**: register the BrightHR API app, and put its client ID and secret in Key Vault as references.
  5. Run the contract tests, and fix the mock until they pass.
  6. Fill `AbsenceTypeMap` and `PregnancyRelatedReasons` in `HRD Settings` from BrightHR's answers.
  7. **P10**: set `BRIGHTHR_MODE=live`.
  8. Watch the first sync's status and warnings (including `departmentNotSet`).
  9. Update `docs/data-inventory.md` with the BrightHR data region and terms of use.

**Checkpoint**: live data can be switched on by a human through configuration only.

---

## Phase 14: Polish and release gate

**Purpose**: Cross-cutting checks from the constitution's quality gates and quickstart.

- [ ] T131 [P] Check `docs/metric-catalogue.md` against the code. Every metric file has its `// Metric:` link, every catalogue edge case has a named test, and rules settled during implementation are recorded. Check `docs/data-inventory.md` against what `buildRecords` and the store actually write.
- [ ] T132 [P] Write `docs/checks/performance.md` from quickstart Q10, for a human to fill in: the timing method (cold after 20 idle minutes, and warm, on office broadband and on 4G), the targets (5 s and 10 s, SC-002), and what to do if the cold start misses (set one always-ready instance, and record it in plan.md Complexity Tracking).
- [ ] T133 Create `docs/checks/release-gate.md` from the release gate checklist in [quickstart.md](quickstart.md#release-gate-checklist). Link each item to its evidence: test commands, the manual-check record (T094), the self-review (T124), the bundle check (T092) and `git diff --stat design-kit/`.
- [ ] T134 Run the whole validation in [quickstart.md](quickstart.md): Q1–Q8 automatically, and Q9–Q10 as human steps. Fix failures. Update `CLAUDE.md` (status, Build & run, known gaps) to match the delivered state.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 Setup** → **Phase 2 Foundational** (blocks everything).
- **Milestone 1**: Phases 3–8 depend on Phase 2. Phase 9 depends on the stories wanted in the
  demo (normally all of them).
- **Milestone 2**: Phase 10 depends on Phase 2 (core) and on the core metrics from Phases 3–8,
  because `/api/dashboard` returns them. It can start once Phase 2 is done, in parallel with
  UI work, because `buildDashboard` sections fill in as stories finish. Phase 11 depends on
  Phase 10 and Phase 5.
- **Milestone 3**: Phase 12 depends on Phases 10 and 11. Phase 13 depends on Phase 10. It can
  run in parallel with Phase 12, but go-live (T130) needs Phase 12 done first. Phase 14 is last.

### User story dependencies

| Story | Needs | Notes |
|---|---|---|
| US1 KPIs (P1) | Phase 2 | MVP. |
| US3 Sales list (P2) | Phase 2 | Independent of US1. |
| US4 Trust and refresh (P2) | Phase 2 (UI part); Phase 10 (back-end part) | |
| US5 Trends (P3) | Phase 2 | The chart primitives (T075, T076) are reused by US6. |
| US6 Attrition (P3) | Phase 2, T075–T076 | |
| US7 Filters (P4) | Phase 2 | Best after the sections it filters exist. |
| US2 Access (P1) | Phases 10–11 | Placed last by the delivery order. The token check itself ships in Phase 10. |

### Within each story

The expected-values file comes first, then the failing tests, which are run and seen to fail.
Then the core implementation, then the `buildDashboard` wiring, then the UI component, then the
end-to-end test.

## Parallel examples

```text
# Phase 2: independent foundations
T011 BrightHR types | T012 record types | T013 response types
T015 Entra fixture | T016 settings fixture | T017 status/history fixtures
T019 calendar tests | T021 absence tests | T022 episode tests | T024 window tests | T025 membership tests
T031 shadow CSS build | T032 project.css | T033 DashboardClient interface

# US1: tests together, then implementations together
T043 M01–M03 tests | T044 M04 tests | T045 M05 tests
T046 M01–M03 | T047 M04 | T048 M05 ; then T050 KpiRow | T051 LastUpdated

# US5
T068 | T069 | T070 | T071  (tests)
T072 metrics | T073 forecast | T075 chart primitives | T076 ChartTable

# Milestone 2
T100 mock directory | T102 reconcile/retention | T103 schedule | T111 provisioning script
```

## Implementation strategy

1. **MVP**: Phases 1–3 (US1 KPIs on sample data). Stop and demo the KPI row in the harness.
2. **Milestone 1 demo**: add US3, then US4 (UI), then US5, then US6, then US7, then Phase 9. A
   human deploys the sample-data web part to a test page (T093).
3. **Milestone 2**: Phases 10–11. Validate locally (`npm run sync:mock`, `func start`, the HTTP
   tests). A human may deploy the Function in mock mode (T117).
4. **Milestone 3**: Phase 12 (a human does the access-control runbook, then the web part
   switches to `api`), then Phase 13 (a human answers B1–B12, runs the contract tests and
   switches to live), then Phase 14.

Commit after each task or logical group, through the branch workflow in CLAUDE.md.

## Notes

- `[P]` = different files and no dependency on an unfinished task.
- When a test was "seen to fail", note it in the commit message for that test (Principle VI
  evidence).
- If real employee data or a secret turns up anywhere, stop and tell the user (CLAUDE.md).
