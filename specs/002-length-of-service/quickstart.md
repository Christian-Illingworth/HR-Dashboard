# Quickstart: validating length of service and work anniversaries (feature 002)

Uses the commands from [CLAUDE.md](../../CLAUDE.md) (Build & run) and feature 001's
[quickstart](../001-hr-dashboard/quickstart.md). Everything runs on synthetic data with today =
**2026-10-27**. Never point any of this at live BrightHR. Expected values are worked out by hand
in `fixtures/expected/service.md` before the code exists (Principle VI).

## Scenarios

| # | Proves | Steps | Expected |
|---|---|---|---|
| V1 | M17 and M18 are right (spec SC-003) | `npm test -w packages/core -- service anniversar` | Every M17 and M18 edge case in [data-model.md §2](data-model.md#2-metrics-add-to-docsmetric-cataloguemd) has a named test, seen failing first. Fixture values match `fixtures/expected/service.md`. |
| V2 | 001 is unchanged | `npm test` | Every feature 001 test still passes with the changed start dates (research S7). No `fixtures/expected/*.md` value from 001 changes. |
| V3 | Names are kept only when switched on (FR-014, FR-015) | `npm test -- records` | With `AnniversaryNames` `Off`, only Sales staff have names. With `On`, every current employee has one, and a leaver's name is cleared. Turning it `Off` clears non-Sales names. |
| V4 | The API sends no more than it should (FR-016, FR-017; SC-004) | `npm test -w apps/sync-function -- http` | The response validates against the updated OpenAPI file. It contains no start date and no name outside `salesAbsences` and `service.anniversaries.entries`. 401 and 403 bodies contain none of the new names. |
| V5 | The section on sample data (Stories 1–3) | `npm run dev:harness`, open `?today=2026-10-27` | The figures and bands match `fixtures/expected/service.md`. Anniversaries: Grace Lindqvist, 10 yrs, Fri 6 Nov (Milestone); Chloe Patel, 5 yrs, Tue 1 Dec (Milestone); Noah Achebe, 6 yrs, Mon 4 Jan; Daniel Reyes, 3 yrs, Fri 8 Jan. Kara Whitfield isn't listed (she leaves on 18 Dec, before her anniversary). With Department = Sales, only Chloe Patel and Daniel Reyes are listed. Picking May 2026 changes nothing in the section. |
| V6 | States and accessibility (FR-010, FR-013; SC-006) | `npm run test:e2e` | axe is clean on the section, including "No staff in this group", the empty list, the switched-off list and the error state, at desktop and 360 px. The list scrolls by keyboard. Milestones are marked in text. No sideways page scroll on a phone. |
| V7 | Styling | `npm run lint:css`, `git diff --stat main -- design-kit/` | No colour literals; no kit edits. |
| V8 | SharePoint and mobile (human) | As 001 Q9 | Record a row in [docs/checks/manual-checks.md](../../docs/checks/manual-checks.md), with the list scrolled by touch in the SharePoint app. |
