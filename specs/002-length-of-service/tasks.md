# Tasks: Length of service and work anniversaries

**Input**: design documents in `specs/002-length-of-service/`: [plan.md](plan.md), [spec.md](spec.md),
[research.md](research.md), [data-model.md](data-model.md),
[contracts/dashboard-api-service.md](contracts/dashboard-api-service.md), [quickstart.md](quickstart.md).

**Tests**: required. The constitution's Principle VI makes calculation tests mandatory, written
and seen to fail before the code, with expected values worked out by hand. Principle II and spec
FR-016/FR-017 need automated leak tests.

**Fixed today**: 2026-10-27 in every test and the harness. Synthetic data only. Never call live
BrightHR.

**Format**: `[ID] [P?] [Story] Description`. [P] = can run in parallel (different files, no
unfinished dependency).

---

## Phase 1: Setup (expected values and fixtures)

**Purpose**: the hand-worked numbers and sample data everything else is tested against.

- [X] T001 Change two start dates in `fixtures/brighthr/employees-current.json` (research S7): Grace Lindqvist `e0000000-0000-4000-8000-000000000007` from `2017-11-06` to `2016-11-06`, and Chloe Patel `e0000000-0000-4000-8000-000000000003` from `2020-09-14` to `2021-12-01`. Make the same changes in `fixtures/README.md` (E03, E07 rows) and `fixtures/scripts/generate-sample-history.mjs`. Rerun the generator and confirm `fixtures/sample-history.json` is unchanged (`git diff --stat fixtures/sample-history.json` empty). Then run `npm test` and `npm run test:e2e`: every feature 001 test must still pass unchanged. If one fails, stop: a 001 value moved, and research S7 is wrong.
- [X] T002 Add `"AnniversaryNames": "On"` to `fixtures/settings.json` (contract: settings change).
- [X] T003 Write `fixtures/expected/service.md` **by hand, without running any code** (CLAUDE.md; Principle VI). For today = 2026-10-27, list every current employee in the fixtures (employed today by 001 D6: e…001 to e…014; e…012 Leo Brennan ends today and counts; e…015 Olivia Grant starts 2026-11-16 and doesn't) with start date, department, completed years, band, and days of service. Work out, for All, Sales, Senior Energy Analyst and the "empty" filter (Sales + Senior Pricing Specialist):
  - M17: average and median of days ÷ 365.25, rounded to 1 dp half away from zero, first-year count, and the six band counts.
  - M18: the anniversaries from 2026-10-27 to 2027-01-27 inclusive. Expected for All: Grace Lindqvist 10 yrs Fri 6 Nov 2026 (milestone), Chloe Patel 5 yrs Tue 1 Dec 2026 (milestone), Noah Achebe 6 yrs Mon 4 Jan 2027, Daniel Reyes 3 yrs Fri 8 Jan 2027; Kara Whitfield (ends 2026-12-18, anniversary 2027-01-11) not listed. Recheck these against the data while working it out, and record any difference as a finding, not a silent fix.
- [X] T004 [P] Add M17 and M18 to `docs/metric-catalogue.md` from [data-model.md §2](data-model.md#2-metrics-add-to-docsmetric-cataloguemd), with anchors `m17` and `m18`, the shared "current staff" and "completed years" rules, and every listed edge case.

---

## Phase 2: Foundational (types, settings, contract)

**Purpose**: the shapes every story builds on. Blocks Phases 3–5.

- [X] T005 Add the types to `packages/core/src/dashboard/types.ts` exactly as [data-model.md §3](data-model.md#3-the-service-section-in-dashboardresponse): `ServiceBand { band: 'under1' | 'y1' | 'y2' | 'y3' | 'y4' | 'y5plus'; label: string; count: number }`, `AnniversaryEntry { name: string | null; role: string; date: IsoDate; years: number; milestone: boolean }`, `ServiceData { averageYears; medianYears; firstYear; bands /* always six, in order */; anniversaries: { enabled: boolean; from: IsoDate; to: IsoDate; entries: AnniversaryEntry[] } }`, and `service: Section<ServiceData>` in `DashboardResponse.sections`. Export them from `packages/core/src/index.ts`.
- [X] T006 Write failing tests in `packages/core/test/settings.test.ts`: `AnniversaryNames` `On` (any case, trimmed) → `anniversaryNames: true`; `Off`, blank, missing or any other value → `false`; the fixture settings parse to `true`. Then add `anniversaryNames: boolean` to `Settings` in `packages/core/src/records/types.ts` and parse it in `parseSettings` in `packages/core/src/records/settings.ts`. Update `inlineContext` defaults in `packages/core/test/contextFor.ts` (`anniversaryNames: true`).
- [X] T007 Add `ServiceSection` and `AnniversaryEntry` to `specs/001-hr-dashboard/contracts/dashboard-api.openapi.yaml` exactly as [contracts/dashboard-api-service.md](contracts/dashboard-api-service.md), including `additionalProperties: false`, `service` in `sections.required`, and `info.version` 0.2.0.
- [X] T008 Register a `service` section in `packages/core/src/dashboard/buildDashboard.ts` (in the section map, the empty map and the response), built by a new `packages/core/src/dashboard/sections/service.ts` through `safeSection`. For now it returns `{ status: 'empty' }`; stories fill it in. Update `packages/dashboard-ui/harness/StateSimulatingClient.ts` so `sectionError` also errors `service`. Run `npm run typecheck` and `npm test`.

**Checkpoint**: the response has a `service` section and validates against the contract.

---

## Phase 3: User Story 1 - Length of service (Priority: P1) 🎯 MVP

**Goal**: average, median, first-year count and six bands for current staff.

**Independent Test**: on the fixtures, the figures and bands match `fixtures/expected/service.md` for All and Sales; the harness shows them with axe clean.

### Tests for User Story 1 ⚠️ (write first, see them fail)

- [X] T009 [P] [US1] Write `packages/core/test/metrics/m17-service.test.ts`. Fixture cases from `fixtures/expected/service.md` (All, Sales, Senior Energy Analyst, empty → "No staff in this group"). Inline edge cases with `inlineContext`, each a named test: start date today → 0 years and Under 1 yr; exactly 1 year today → 1–2 yrs; one employee → average = median; even count → median is the mean of the middle two; a leaver ending today counts and a future starter doesn't; a `2024-02-29` start on today = `2025-02-28` → 1 completed year; rounding half away from zero (001 D8). Write the expected numbers in the test comments as worked by hand. *As built*: M17 returns unrounded years; rounding is the shared D8 `round1` (already tested), and the rounded figures are checked in `packages/core/test/buildDashboard.test.ts`.

### Implementation for User Story 1

- [X] T010 [US1] Implement `packages/core/src/metrics/lengthOfService.ts` with `// Metric: docs/metric-catalogue.md#m17`: `completedYears(startDate, date)` (clamping 29 February via the existing `addMonthsClamped`), and `lengthOfService(ctx)` returning `{ averageYears, medianYears, firstYear, bands }` for current staff in the filter group (001 D6 and D3 at today) or `null` when there are none. Band labels: "Under 1 yr", "1–2 yrs", "2–3 yrs", "3–4 yrs", "4–5 yrs", "5+ yrs". Make T009 pass.
- [X] T011 [US1] Fill `packages/core/src/dashboard/sections/service.ts` with M17: `status: 'empty', message: 'No staff in this group'` when `lengthOfService` is `null`, otherwise `ok` with `anniversaries: { enabled: false, from: today, to: today, entries: [] }` until US2. Add a case to `packages/core/test/buildDashboard.test.ts` checking the section on the fixtures.
- [X] T012 [P] [US1] Write a failing `packages/dashboard-ui/test/ServiceSection.test.tsx`, then build `packages/dashboard-ui/src/components/ServiceSection.tsx` (research S6): a `SectionCard` titled "Length of service" with the subtitle "Current staff · from BrightHR start dates · {department}" ("All departments" when the department filter is All), a `.kpi-strip` of three `.kpi-mini` ("Average", "Median" with " yrs", "In first year"), and a `.bar-list` of six non-interactive `.bar-row`s (`.bar-name`, `.bar` with width as a share of the largest count, `.bar-val`). Each row has an accessible name such as "2–3 yrs: 2 people". Loading, empty ("No staff in this group") and error states through `SectionState`, as other sections.
- [X] T013 [US1] Render `ServiceSection` in `packages/dashboard-ui/src/App.tsx` after the attrition section. Add layout CSS in `packages/dashboard-ui/src/styles/project.css` (tokens only: two columns from 720 px, one below), then `npm run build:css -w @hrd/dashboard-ui`.
- [X] T014 [P] [US1] Add `packages/dashboard-ui/e2e/service.spec.ts`: on `?today=2026-10-27` the figures and band counts match `fixtures/expected/service.md`; axe clean at desktop and phone; no horizontal page scroll at 360 px; `?state=sectionError` shows the section's error state.

**Checkpoint**: Story 1 works on sample data and needs no new personal data.

---

## Phase 4: User Story 2 - Work anniversaries (Priority: P2)

**Goal**: the next 3 months' anniversaries, with names stored only while `AnniversaryNames` is on.

**Independent Test**: on the fixtures, the list matches `fixtures/expected/service.md`; with the setting off, no non-Sales name is stored or sent.

### Tests for User Story 2 ⚠️

- [X] T015 [P] [US2] Write failing tests in `packages/core/test/records.test.ts` for names (data-model §1): with `anniversaryNames: false`, only Sales-department employees have names (001 behaviour unchanged); with `true`, every employee employed on the sync date has a name, and a non-Sales leaver whose end date is before the sync date has `givenName: null, familyName: null`; a Sales leaver keeps the 001 rule. Turning the setting from true to false gives `null` names to non-Sales staff (a changed content hash).
- [X] T016 [P] [US2] Write `packages/core/test/metrics/m18-anniversaries.test.ts`. Fixture case for All and Sales from `fixtures/expected/service.md`. Inline edge cases, each named: anniversary today is listed; leaving the day before the anniversary → not listed, leaving on it → listed; a first anniversary → `years: 1`; a `2024-02-29` start with today `2027-02-01` → listed on `2027-02-28` with `years: 3`; several on one day → by family name, then given name; the window end clamps (today `2026-11-30` → `to: 2027-02-28`); multiples of 5 → `milestone: true`, others false; no name → `name: null`; nothing in the window → empty `entries`.
- [X] T017 [P] [US2] Extend `apps/sync-function/test/http/dashboard.test.ts` and `apps/sync-function/test/http/no-leak.test.ts` (contract V4): the 200 body validates against the updated OpenAPI file; it contains no fixture start date (search the body for every `employment.start` value); names appear only under `salesAbsences` and `service.anniversaries.entries`; with a store whose settings have `AnniversaryNames` `Off`, `anniversaries.enabled` is false and `entries` is empty; 401 and 403 bodies contain none of the anniversary names.

### Implementation for User Story 2

- [X] T018 [US2] Change `packages/core/src/sync/buildRecords.ts` so names are kept for Sales staff, and for everyone employed on the sync date when `settings.anniversaryNames` is true (data-model §1). Make T015 pass.
- [X] T019 [US2] Implement `packages/core/src/metrics/anniversaries.ts` with `// Metric: docs/metric-catalogue.md#m18`, reusing `completedYears` from `lengthOfService.ts`: window today to `addMonthsClamped(today, 3)` inclusive; employees in the filter group by current department and role; employed on the anniversary date; `years ≥ 1`; `milestone` = `years % 5 === 0`; name = given and family name, or `null` if both are missing; sorted by date, family name, given name. Make T016 pass.
- [X] T020 [US2] In `packages/core/src/dashboard/sections/service.ts`, set `anniversaries` to `{ enabled: settings.anniversaryNames, from, to, entries }`, with `entries: []` when disabled. Make T017 pass (`npm test -w apps/sync-function -- http`).
- [X] T021 [US2] Add the anniversary list to `packages/dashboard-ui/src/components/ServiceSection.tsx` and `packages/dashboard-ui/test/ServiceSection.test.tsx` (tests first): heading "Work anniversaries · next 3 months"; `.list-row`s in a scroll area (`tabindex="0"`, `role="region"`, accessible name "Work anniversaries") with a max height from tokens; each row: a `.badge` "1 yr" / "7 yrs" (milestones add `tone-teal` **and** a visible `.tag tone-teal` "Milestone"), the name (or "Name not recorded"), " · " and job title, and the date as "Mon 2 Nov" via `Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })`. Empty: "No work anniversaries in the next 3 months". Disabled: "Work anniversaries aren't switched on yet." Rebuild CSS.
- [X] T022 [P] [US2] Extend `packages/dashboard-ui/e2e/service.spec.ts`: the four expected entries in order with dates and milestone tags; the list region scrolls with the keyboard; axe clean.
- [X] T023 [P] [US2] Update `docs/data-inventory.md`'s "Given and family name" row as in [data-model.md §1](data-model.md#data-inventory-change-docsdata-inventorymd), and add `AnniversaryNames = 'Off'` to the settings in `scripts/provision-lists.ps1` (check it still parses).
- [X] T024 [P] [US2] Add a step to `docs/runbooks/go-live.md` §6 (settings): the HR data owner decides on `AnniversaryNames`; set it `On` only with their approval, recorded with the date; turning it `Off` clears non-Sales names at the next sync.

**Checkpoint**: anniversaries work on sample data; on live data they stay off until approved.

---

## Phase 5: User Story 3 - Filters (Priority: P3)

**Goal**: department and role narrow the section; the month doesn't.

**Independent Test**: Department = Sales shows only Chloe Patel and Daniel Reyes in the list and Sales-only figures; picking May 2026 changes nothing in the section.

- [X] T025 [P] [US3] Add cases to `packages/core/test/filters.test.ts`: the role filter "Senior Energy Analyst" and the department filter "Pricing" narrow M17 and M18 to the values in `fixtures/expected/service.md`; `month: '2026-05'` leaves the `service` section identical to the current month's.
- [X] T026 [US3] Make T025 pass if needed (the section must read only today, never the selected month), and make the subtitle in `ServiceSection.tsx` follow the department filter.
- [X] T027 [P] [US3] Add to `packages/dashboard-ui/e2e/filters.spec.ts`: Department = Sales → the subtitle says "Sales" and only the two Sales anniversaries are listed; Month = May 2026 → the section is unchanged; the "empty" filter → "No staff in this group".

---

## Phase 6: Polish and release gate

- [X] T028 Run the whole [quickstart](quickstart.md) V1–V7: `npm test`, `npm run typecheck`, `npm run lint`, `npm run lint:css`, `npm run test:e2e`, `npm run build:webpart` (bundle check), and `git diff --stat main -- design-kit/` (empty). Fix failures.
- [X] T029 [P] Add the section to "How to run each check" in `docs/checks/manual-checks.md` (quickstart V8): the anniversary list scrolls by touch in the SharePoint app and by keyboard, and a screen reader reads each band as name and count and each milestone as "Milestone". A human then fills in a row.
- [X] T030 Update `CLAUDE.md`: feature 002's status, and the `AnniversaryNames` setting under Known gaps (off until the HR data owner approves).

---

## Dependencies & Execution Order

- **Phase 1** first. T001 must pass before anything else: it proves 001 is unaffected. T003 (hand-worked values) comes before any metric test.
- **Phase 2** blocks the stories. T005 → T006, T007, T008.
- **US1 (Phase 3)**: T009 → T010 → T011 → T012/T013 → T014.
- **US2 (Phase 4)** needs T010 (`completedYears`) and T011. T015 → T018; T016 → T019; T017 → T020; then T021 → T022. T023 and T024 can run any time in the phase.
- **US3 (Phase 5)** needs US1 and US2's section.
- **Phase 6** last.

### Parallel opportunities

- T004 with T001–T003.
- T009 (core test) with T012's UI test, once T005 exists.
- T015, T016 and T017 together; T023 and T024 alongside.
- T025 and T027 together.

## Implementation Strategy

1. **MVP = Phases 1–3**: length of service on sample and live data. It needs no new personal data
   and no approval, so it can go live with feature 001.
2. **Then US2**: the code ships with `AnniversaryNames` off. The anniversary list appears on live
   data only when the HR data owner turns the setting on.
3. **Then US3** and the polish phase.
