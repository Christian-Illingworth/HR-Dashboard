# Research: Length of service and work anniversaries (feature 002)

Feature 002 adds one section to the dashboard built by feature 001, so it inherits 001's stack
and decisions ([001 research](../001-hr-dashboard/research.md)): pure calculations in
`packages/core`, React on the design kit in `packages/dashboard-ui`, the Azure Function serving
`/api/dashboard`, and SharePoint lists for synced data. Nothing new is added to the stack. These
are the decisions specific to 002.

## S1. Where the figures are calculated

- **Decision**: two new pure metrics in `packages/core`: M17 length of service (average, median,
  first year, bands) and M18 work anniversaries. `buildDashboard` adds a `service` section, which
  the Function returns and the sample mode calculates in the browser, as for every other section.
- **Rationale**: Principle VI (pure, test-first calculations) and 001 R15 (figures worked out per
  request). The inputs (start date, end date, current department and role) are already in the
  records.
- **Alternatives**: calculating in the UI from an employee list (rejected: it would send every
  start date to the browser, against spec FR-016 and FR-017); storing the figures at sync time
  (rejected: 001 R15).

## S2. How years are measured

- **Decision**:
  - *Completed years* (bands, anniversary years, "first year"): whole years from the start date
    to the date in question, where a year is complete on the start date's anniversary. A
    29 February start completes its year on 28 February in years without one, the same clamping
    as 001's D6 date arithmetic.
  - *Average and median*: days of service from the start date to today, divided by 365.25, then
    rounded to 1 decimal place, half away from zero (001 D8). The median of an even count is the
    mean of the two middle values before rounding.
- **Rationale**: whole years match how people talk about service and keep band edges exact.
  Days ÷ 365.25 gives a smooth average without a date library.
- **Alternatives**: completed months ÷ 12 (rejected: coarser, and gives the same 1 dp figure for
  people up to 30 days apart).

## S3. The service bands

- **Decision**: six bands by completed years: Under 1 yr (0), 1–2 yrs (1), 2–3 yrs (2), 3–4 yrs
  (3), 4–5 yrs (4) and 5+ yrs (5 or more). This is the user's list ("under 1yr, 2yr, 3yr, 4yr,
  5yr and 5+yr") read as upper bounds (spec Assumptions).
- **Rationale**: no overlaps and no gaps; every current employee is in exactly one band.

## S4. Storing names for every current employee

- **Decision**: a new setting in `HRD Settings`, **`AnniversaryNames`** (`On` or `Off`, default
  `Off`). Only the data administrators can change it (001 FR-028), so turning it on is the HR data
  owner's recorded approval (spec FR-014).
  - `Off`: the sync keeps names for Sales staff only, as now. The anniversary list says
    "Work anniversaries aren't switched on yet." The length-of-service figures still show.
  - `On`: the sync keeps names for every employee employed on the sync date. A leaver's name is
    cleared at the first sync after their end date (spec FR-015).
  - Turning it back to `Off` clears non-Sales names at the next sync.
  - The synthetic sample settings have it `On`, so the demo shows the list.
- **Rationale**: Principle II says a field must not be synced until it is in the data inventory
  with its purpose. A setting lets the code ship with Story 1 while the names wait for approval,
  and gives HR a way to withdraw it without a release.
- **Alternatives**: hold back Story 2's code until approval (rejected: it couples a release to a
  sign-off and gives no way to withdraw); show anniversaries without names (rejected: in a small
  department the role and date identify the person anyway, so it gives no real protection and
  little use).

## S5. What the API sends

- **Decision**: the `service` section carries the three figures, six band counts, and a list of
  anniversary entries (name, job title, date, years, milestone). It never carries a start date
  or a per-person length of service (spec FR-016, FR-017). Names appear only for people in that
  list.
- **Rationale**: Principle II: what isn't sent can't leak. The figures need no per-person data in
  the browser.

## S6. UI components

- **Decision**: use the design kit as it is. No kit changes are needed.
  - Headline figures: `.kpi-strip` with three `.kpi-mini` (DESIGN.md: "secondary numbers").
  - Bands: `.bar-list` (DESIGN.md: "ranked amounts"), with each row as a non-interactive
    `.bar-row` holding the band name, the bar and the count as text. The bar uses the kit's
    default bar colour.
  - Anniversaries: `.list-row`s in a scroll area with a fixed maximum height, focusable
    (`tabindex="0"`, with an accessible name) so keyboard users can scroll it. Each row has a
    `.badge` with the years. A milestone badge adds `tone-teal` (border and tint) **and** a
    visible "Milestone" `.tag`, so the difference isn't colour alone (Principle IV).
  - Dates are formatted with `Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric',
    month: 'short' })`, giving "Mon 2 Nov". There is no date library (001 plan).
- **Spec change**: the bars show every value as text beside them, and the list is itself readable
  by a screen reader as band and count. So the bars need no tooltip, and the list is the text
  equivalent that Principle IV asks for. Spec FR-005 is updated to say so instead of requiring
  001's chart tooltips and table toggle.
- **Alternatives**: the existing monthly `BarChart` (rejected: it's built for months on an x
  axis; the bands are categories with a single series).

## S7. Sample data

- **Decision**: change only start dates that are before the 13-month history window
  (1 Oct 2025), so that none of feature 001's expected values move:
  - Grace Lindqvist (e…007): 2017-11-06 → **2016-11-06**: a 10-year milestone on Fri 6 Nov 2026.
  - Chloe Patel (e…003, Sales): 2020-09-14 → **2021-12-01**: a 5-year milestone on Tue 1 Dec
    2026, so the Sales filter has an anniversary too.
  - The same dates change in `fixtures/README.md` and `fixtures/scripts/generate-sample-history.mjs`.
  - Already present: Noah Achebe's 6 years on Mon 4 Jan 2027; Daniel Reyes's 3 years (Sales) on
    Fri 8 Jan 2027; Kara Whitfield, who leaves on
    18 Dec 2026, before her anniversary on 11 Jan (not listed); Olivia Grant, a future starter
    (not counted).
- **Not in the sample data**: someone under 1 year, a first anniversary in the next 3 months,
  and a 29 February start. Each needs a start date inside the history window, which would change
  001's headcount, starters and attrition values. These cases are covered by inline unit tests
  instead, and spec FR-018 is narrowed to match.
- **Rationale**: Principle VI: expected values are worked out by hand, and reworking every 001
  expected file for a demo nicety is risky.

## S8. Placement and layout

- **Decision**: the section goes after the attrition section. On desktop the figures sit in the
  card head, with the bars on the left and the list on the right (as in the approved mock). Below
  720 px the list goes under the bars, and the scroll area is shorter. Project CSS uses kit tokens
  only (Stylelint).
