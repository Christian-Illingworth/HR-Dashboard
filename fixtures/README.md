# Fixtures

Synthetic data for tests, the UI harness and the web part's mock-data mode.

## Rules

- **Synthetic only.** Every person, email address, date and sickness reason here is made up.
  Real employee data must never be added, in any form (CLAUDE.md, constitution Principles VI
  and VII). If you find real data here, stop and tell the project owner.
- **Same shape as BrightHR.** Files under `brighthr/` follow the BrightHR Customer API v1
  response shapes exactly (`ListResponseDto` pages with `items` and `continuationToken`). See
  [contracts/brighthr-consumed.md](../specs/001-hr-dashboard/contracts/brighthr-consumed.md).
- **Roles** are the spec's: Energy Analyst, Senior Energy Analyst, Senior Pricing Specialist and
  Sales Team Manager. Departments include **Sales**.
- **Fixed "today": 2026-10-27** (a Tuesday, GMT). Tests never read the system clock.
- **Expected values** in `expected/` are worked out by hand, with the workings shown, never by
  running the code under test (constitution Principle VI).

## Layout

| Path | Contents |
|---|---|
| `brighthr/employees-current.json` | Current employees, as `EmployeeDto` pages (two pages, to exercise paging) |
| `brighthr/employees-terminated.json` | Leavers, as `EmployeeDto` pages |
| `brighthr/absences/<employeeId>.json` | Each employee's absences, as `AbsenceDto` pages |
| `entra/users.json` | Synthetic Entra ID users with departments |
| `settings.json` | `HRD Settings` values |
| `sample-sync-status.json` | Sync status for the mock-data mode (history from 2025-10-01) |
| `sample-history.json` | `HRD Employee History` rows, one per employee per month |
| `launch-sync-status.json` | Sync status for the "just launched" scenario (history from 2026-07-29) |
| `expected/*.md` | Hand-worked expected values |

## The people

| ID | Name | Department | Role | Employment |
|---|---|---|---|---|
| E01 | Amelia Hart | Sales | Sales Team Manager | 2019-03-04 → |
| E02 | Ben Okafor | Sales | Energy Analyst | 2021-06-01 → |
| E03 | Chloe Patel | Sales | Senior Energy Analyst | 2021-12-01 → |
| E04 | Daniel Reyes | Sales (Analysis until 2026-07) | Energy Analyst | 2024-01-08 → |
| E05 | Ella Novak | Pricing | Senior Pricing Specialist | 2018-05-21 → |
| E06 | Finn Gallagher | Pricing | Senior Pricing Specialist | 2022-02-01 → |
| E07 | Grace Lindqvist | Analysis | Senior Energy Analyst | 2016-11-06 → |
| E08 | Harry Mensah | Analysis | Energy Analyst | 2023-04-03 → |
| E09 | Isla Moreau | Analysis | Energy Analyst | 2025-02-10 → |
| E10 | Jacob Ferreira | Operations | Energy Analyst | 2022-08-15 → |
| E11 | Kara Whitfield | Operations | Senior Energy Analyst | 2016-01-11 → 2026-12-18 (known leaver) |
| E12 | Leo Brennan | Analysis | Energy Analyst | 2024-09-02 → 2026-10-27 (leaves today) |
| E13 | Maya Sorensen | Not set (no Entra match) | Energy Analyst | 2023-10-02 → |
| E14 | Noah Achebe | Not set (blank Entra department) | Senior Energy Analyst | 2021-01-04 → |
| E15 | Olivia Grant | Pricing | Energy Analyst | 2026-11-16 → (future starter) |
| T01 | Priya Kaur | Analysis | Energy Analyst | 2022-03-07 → 2026-02-27 |
| T02 | Quinn Adeyemi | Sales | Energy Analyst | 2023-07-03 → 2026-08-14 |
| T03 | Ruth Castellano | Pricing | Senior Pricing Specialist | 2019-09-02 → 2025-12-19 |
| T04 | Sam Whitaker | Operations | Energy Analyst | 2025-11-03 → 2026-05-29 |
