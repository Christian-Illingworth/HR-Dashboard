# Implementation Plan: Length of service and work anniversaries

**Branch**: `002-length-of-service` | **Date**: 2026-10-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-length-of-service/spec.md`

## Summary

Add a "Length of service" section to the HR Dashboard: average and median service, staff in their
first year, six service bands, and a list of work anniversaries over the next 3 months. Two new
pure metrics in `packages/core` (M17, M18) feed a new `service` section of the existing
`/api/dashboard` response, rendered with the design kit's bar list, KPI strip, list rows and
badges. Names for non-Sales staff are stored only while a new `AnniversaryNames` setting is on,
which is how the HR data owner approves the data change (research S4). No new service, library or
infrastructure.

## Technical Context

**Language/Version**: TypeScript on Node 22 LTS (runs on Node 24 here), as feature 001.

**Primary Dependencies**: none new. React 17, the Consultiv design kit, Vitest, React Testing
Library, Playwright with axe, `@azure/functions`, all from 001.

**Storage**: the existing `HRD Employees` list (its `GivenName`/`FamilyName` columns already
exist) and one new `HRD Settings` key, `AnniversaryNames`.

**Testing**: Vitest unit tests for M17 and M18 with hand-worked expected values in
`fixtures/expected/service.md` and a fixed today of 2026-10-27; records-builder tests for the
names setting; HTTP contract and no-leak tests; Playwright and axe for the section's states.

**Target Platform**: the SPFx web part in SharePoint Online and the SharePoint mobile app; the
Azure Function (Flex Consumption, UK South).

**Project Type**: an addition to the existing web part, Function and shared core.

**Performance Goals**: within 001 SC-002 (data in 5 s on broadband, 10 s on 4G). The new figures
are O(n) over fewer than 250 employees.

**Constraints**: no start dates or per-person service figures in API responses (FR-016, FR-017);
no 001 expected value may change (FR-018); kit tokens only.

**Scale/Scope**: one section, two metrics, one setting, about 20 tasks.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-research | Post-design |
|---|---|---|
| **I. Security First** | ✅ No new BrightHR call or field; nothing new reaches the browser from BrightHR. | ✅ Unchanged: the same allow-listed client and Entra-checked API. |
| **II. Data Protection by Design** | ⚠️ Names for every current employee is a newly stored field use. | ✅ Stored only while `AnniversaryNames` is on, which only the data administrators can set (S4). Data inventory row updated (data-model §1). Leavers' names cleared at the next sync. The API sends names only inside listed entries, and never start dates; `additionalProperties: false` and a no-leak test enforce it (contracts). No sickness data involved, so small-group inference doesn't arise. |
| **III. SharePoint-Hosted, Consultiv-Branded** | ✅ | ✅ Kit components only: `.kpi-strip`, `.bar-list`, `.list-row`, `.badge`, `.tag` (S6). Not the mock's blue. No `design-kit/` edits. Phone layout stacks (S8). |
| **IV. Accessible** | ✅ | ✅ Values are text beside the bars; the bar list is the text equivalent (FR-005 updated). Milestones have a visible "Milestone" tag, not colour alone. The scroll area is keyboard-focusable. axe on every state (quickstart V6). |
| **V. Honest Data** | ✅ | ✅ M17 and M18 go in the metric catalogue with edge cases, and their code links to it. "Last updated" and "Mock data" already cover the page. No forecasts. |
| **VI. Test-First Calculations** | ✅ | ✅ Pure functions with today passed in; expected values by hand in `fixtures/expected/service.md`; tests written and seen failing first. Cases the sample data can't hold are inline tests (S7). |
| **VII. Mock-First Development** | ✅ | ✅ Fixture start dates changed only before the history window, so the mock stays BrightHR-shaped and 001 values don't move. Synthetic settings switch names on. |
| **VIII. Keep It Simple** | ✅ | ✅ No new service, library or component; one setting. |
| **Security & Data Handling** | ✅ | ✅ Names stay in the data site. Logs carry no names (existing typed logger). |

No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-length-of-service/
├── plan.md                              # This file
├── research.md                          # S1–S8
├── data-model.md                        # Names rule, M17, M18, the service section
├── quickstart.md                        # V1–V8
├── contracts/dashboard-api-service.md   # OpenAPI addition and the settings key
└── tasks.md                             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/core/
├── src/metrics/lengthOfService.ts       # M17 (new)
├── src/metrics/anniversaries.ts         # M18 (new)
├── src/dashboard/sections/service.ts    # builds the service section (new)
├── src/dashboard/types.ts               # ServiceData, AnniversaryEntry; sections.service
├── src/records/settings.ts, types.ts    # AnniversaryNames → settings.anniversaryNames
├── src/sync/buildRecords.ts             # names for current staff when the setting is on
└── test/metrics/m17-service.test.ts, m18-anniversaries.test.ts, records.test.ts

packages/dashboard-ui/
├── src/components/ServiceSection.tsx    # bars, figures, anniversary list (new)
├── src/App.tsx                          # placed after the attrition section
├── src/styles/project.css               # layout and scroll area (tokens only)
├── test/ServiceSection.test.tsx         # new
└── e2e/service.spec.ts                  # states, axe, phone width (new)

apps/sync-function/
├── test/http/dashboard.test.ts, no-leak.test.ts   # contract and leak checks for the new section
└── (no source change: it returns buildDashboard's output)

fixtures/
├── brighthr/employees-current.json      # two start dates (research S7)
├── settings.json                        # AnniversaryNames: On
├── expected/service.md                  # hand-worked M17 and M18 (new)
├── README.md, scripts/generate-sample-history.mjs   # the same two dates

docs/metric-catalogue.md (M17, M18) · docs/data-inventory.md (names row)
specs/001-hr-dashboard/contracts/dashboard-api.openapi.yaml (ServiceSection, version 0.2.0)
scripts/provision-lists.ps1 (AnniversaryNames = Off)
```

**Structure Decision**: no new package or app. The feature follows 001's split: calculations in
`packages/core`, view in `packages/dashboard-ui`, and the Function unchanged apart from tests,
because it already returns whatever `buildDashboard` builds.

## Spec follow-ups (made during planning)

- **FR-005**: the bars carry their values as text, so the bar list is the text equivalent; no
  tooltip or table toggle (research S6).
- **FR-014**: approval takes the form of the `AnniversaryNames` setting, off by default
  (research S4).
- **FR-018**: narrowed to what the sample data can show without changing 001 values; the rest is
  in unit tests (research S7).

## Complexity Tracking

None. The plan adds no service, library or infrastructure.

## Phase 2 preview (for `/speckit-tasks`)

1. Hand-work `fixtures/expected/service.md` and add M17 and M18 to the metric catalogue.
2. Failing tests for M17, M18 and the names setting, then the core code; the `service` section in
   `buildDashboard`.
3. Change the two fixture start dates; confirm every 001 test still passes.
4. The OpenAPI addition, and Function contract and no-leak tests.
5. `ServiceSection` in the UI, harness states, e2e and axe.
6. The data inventory, the provisioning script, the runbooks (the HR data owner switches the
   setting on), CLAUDE.md.
