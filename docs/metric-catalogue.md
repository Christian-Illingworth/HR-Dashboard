# Metric catalogue

This is the living metric catalogue (constitution Principle V). Keep it up to date: every metric's code links here by ID, for example `// Metric: docs/metric-catalogue.md#m04`, and every edge case listed here has a test. It started as section 4 of [specs/001-hr-dashboard/data-model.md](../specs/001-hr-dashboard/data-model.md).

### Shared definitions

<a id="d1"></a>
**D1. Working-day fractions.** For an absence with `startDate`…`endDate` (an open-ended
sickness ends at today):
- Every working day in the range counts 1, except at the boundaries. A boundary day counts
  only the half it covers. `FirstHalf` is the morning and `SecondHalf` the afternoon.
  - Start day: a `startPart` of `SecondHalf` counts 0.5 (the absence starts in the afternoon).
    `FirstHalf`, `FullDay` and `LocalDate` count the whole day.
  - End day: an `endPart` of `FirstHalf` counts 0.5 (the absence ends at midday, which is
    also why the return date is that same day, M15). `SecondHalf`, `FullDay` and
    `LocalDate` count the whole day.
  - One-day absence: morning only (`FirstHalf` to `FirstHalf`) or afternoon only
    (`SecondHalf` to `SecondHalf`) counts 0.5. `FirstHalf` to `SecondHalf` counts 1.
  - *(Revised during implementation, 2026-10-27. The first draft counted any half part as
    0.5, which made a multi-day absence starting "in the morning" lose half a day, and
    contradicted the return-date rule.)*
- If both parts are `Time` and the dates are the same, the day counts 0.5. A `Time` boundary
  on a multi-day absence counts its day as 1. *(Project rule, to confirm with HR; BrightHR
  gives no length for non-sickness types.)*
- **Sickness with a `duration`**: total days = `durationDays`, or `durationMinutes` ÷
  (`StandardDayHours` × 60). Each working day's fraction is scaled so the fractions add up to
  that total. For an open-ended absence the duration is ignored and the calendar count is used.
- Weekends and bank holidays count 0 (spec edge case).
- **Known limitation**: there is no working pattern in BrightHR, so part-time staff's
  non-sickness days are over-counted (R9 point 4).

<a id="d2"></a>
**D2. Sickness episode.** Each sickness absence is an episode, except that two sickness
absences of the same employee are merged when there is no working day between the end of one
and the start of the next. An example is sick on Friday and again on Monday. An episode
counts in the month it starts (spec edge case).

<a id="d3"></a>
**D3. Group membership.** A filter (department, role, or "All") is applied to each employee
**as at the date being measured**:
- today and future dates: the employee's current `department` and `jobTitle`;
- a past date: the `HRD Employee History` row for that month; if there is no row (before the
  first sync), the employee's earliest row; if there are no rows, the current values.

The response states `departmentHistoryStartMonth`, so the UI can say "Departments and roles
before <month> use the earliest values known".

<a id="d4"></a>
**D4. Month kinds and coverage.**
- `actual` = months before the current month. `toDate` = the current month, labelled "to date".
  `future` = months after it.
- `coverage` compares the month with `historyStartDate`: `full` if the month starts on or after
  it, `partial` if it contains it, and `none` if it ends before it. Coverage affects absence
  metrics (M06–M09, M13) but not employment-date metrics (M01, M04, M10–M12, M14).
- **Window**: the selected month `s` (default: the current month), and months `s−3` to `s+3`.
  The **month picker** offers months `s` from current − 9 to current where `s−3` is on or
  after `historyStartDate`'s month. The current month is always offered (FR-021, spec edge
  case).

<a id="d5"></a>
**D5. Absence category.** `Sickness` → `sickness`. Otherwise the first line of
`AbsenceTypeMap` whose `displayName` matches, ignoring case, decides. Without a match:
`Holiday` → `annualLeave`, `Toil` → `other`, `Other` → `other`, and anything else → `other`.
Categories: `annualLeave`, `publicHoliday` (left out of every metric), `sickness`,
`compassionate`, `unpaid`, `other`.

<a id="d6"></a>
**D6. Headcount at a date `d`.** The number of employees with `startDate` ≤ `d` and
(`endDate` is null or `endDate` ≥ `d`), within the filter group (D3). People, not FTE.

<a id="d7"></a>
**D7. Status.** Every stored absence is **Approved**, because BrightHR lists only approved
absences (R9). Pending values are `null` with `pendingAvailable: false` until BrightHR answers
question B3.

<a id="d8"></a>
**D8. Rounding.** Calculations keep full precision. Values are rounded only in the API
response, to 1 decimal place, half away from zero (3.75 → 3.8). Counts of people and episodes
are whole numbers and aren't rounded.

### Metrics

Each entry gives the ID that code links to, the definition, the BrightHR sources, the formula
and the edge cases. Every listed edge case needs a test (Principle VI).

<a id="m01"></a>

#### M01. Headcount (KPI)

- **Definition**: people employed today in the filter group.
- **Sources**: `employment.start`, `employment.end`; Entra `department`; `employment.jobTitle`.
- **Formula**: D6 with `d` = today.
- **Edge cases**: a leaver whose `endDate` = today counts. A starter with a future
  `startDate` doesn't. An empty group → 0, shown as "0" (headcount 0 is a real answer).

<a id="m02"></a>

#### M02. On leave today (KPI)

- **Definition**: distinct people in the group with approved **annual leave** covering today,
  including half days (spec US1 scenario 3; assumption "On leave today").
- **Sources**: `$type`, `displayName`, `start`, `end`, `datePart`.
- **Formula**: count of distinct `employeeId` with a `annualLeave` absence whose AbsenceSpan
  includes today with fraction > 0.
- **Edge cases**: a morning-only absence counts. Today is a weekend or bank holiday → 0.
  Two overlapping records for one person count once. Public holidays don't count.

<a id="m03"></a>

#### M03. Off sick today (KPI)

- **Definition**: distinct people in the group with a sickness absence covering today.
- **Sources**: `$type`, `start`, `end`, `datePart`.
- **Formula**: as M02, for category `sickness`. Open-ended sickness with `startDate` ≤ today
  counts. Pregnancy-related sickness counts (it is excluded only from the Bradford Factor).
- **Edge cases**: a half day counts. A sickness starting tomorrow doesn't. Today is not a
  working day → 0.

<a id="m04"></a>

#### M04. Rolling 12-month attrition % (KPI)

- **Definition**: leavers in the last 12 months ÷ average headcount over those months × 100
  (FR-008). All leavers, whatever the reason.
- **Sources**: `employment.start`, `employment.end`.
- **Formula**:
  - Period P = (today − 12 months, today], meaning from the day after
    "today − 12 months" to today inclusive.
  - L = employees in the group (D3, at their `endDate`) with `endDate` in P.
  - H̄ = mean of D6 at the 13 dates `today − k months` for k = 0…12. If the day of the month
    doesn't exist, use the last day of that month.
  - Attrition = L ÷ H̄ × 100. Displayed to 1 decimal place. Unrounded internally.
- **Edge cases**: H̄ = 0 → "No staff in this group" (spec edge case), not 0 or an error.
  Someone who started and left inside P counts as a leaver. A future `endDate` is not a leaver
  yet. Leap days: today = 2028-02-29 → the dates use 2027-02-28 and so on.

<a id="m05"></a>

#### M05. Average Bradford Factor (KPI)

- **Definition**: the mean of each current employee's Bradford Factor S² × D over the last
  52 weeks, including zeros (FR-009). Only the average is shown.
- **Sources**: `$type: Sickness`, `start`, `end`, `datePart`, `duration`; `PregnancyRelated`
  (from `reason.description`); employee dates.
- **Formula**:
  - Basis period B = the 364 days ending today (today − 363 … today), or
    `historyStartDate` … today if that is shorter.
  - For each employee in the group today (M01): S = sickness episodes (D2) not marked
    pregnancy-related that have at least one day in B. D = sum of their working-day fractions
    (D1) falling in B.
  - Average = Σ(S² × D) ÷ the number of employees. Displayed to 1 decimal place.
- **Edge cases**: no employees → "No staff in this group". B shorter than 364 days → the KPI
  says "Based on data since <date>". An episode that started before B counts in S, but only its
  days inside B count in D. An open-ended episode counts up to today. A starter part-way
  through B is included, using only their own days. Pregnancy-related episodes are left out of
  S and D. A merged episode (D2) counts once in S.

<a id="m06"></a>

#### M06. Annual leave days per month (leave chart)

- **Definition**: working days of approved annual leave in each month of the window (FR-011).
- **Sources**: `$type`, `displayName`, `start`, `end`, `datePart`.
- **Formula**: Σ D1 fractions for category `annualLeave`, for employees in the group at each
  day (D3), split by month.
  - `actual` months: days taken. `toDate`: taken to today plus booked for the rest of the
    month. `future`: booked.
  - `approvedDays` = that total. `pendingDays` = `null` (D7).
- **Edge cases**: leave spanning two months is split. Half days count 0.5. Bank holidays count
  0. Partial-coverage months are marked (D4). A future month with no bookings shows 0, not
  "no data", if B5 confirms that future dates are returned.

<a id="m07"></a>

#### M07. Sickness days per month (sickness chart)

- **Definition**: working days lost to sickness per month (FR-012).
- **Sources**: `$type: Sickness`, `start`, `end`, `datePart`, `duration`.
- **Formula**: Σ D1 fractions for category `sickness` per month, for employees in the group at
  each day. Pregnancy-related sickness **is** included (it is left out only of M05).
  `actual`/`toDate` months: actual values, with `toDate` counting up to today. `future`: the
  forecast (M13).
- **Edge cases**: spans two months → split. Open-ended → up to today. `none`/`partial`
  coverage → value shown with "No absence data before <date>".

<a id="m08"></a>

#### M08. Sickness episodes per month (sickness chart)

- **Definition**: episodes (D2) **starting** in each month (spec edge case), for employees in
  the group on the episode's start date.
- **Sources**: as M07.
- **Formula**: count. `future` months: the forecast (M13).
- **Edge cases**: an episode spanning two months counts once, in its start month. Merged
  absences (D2) count once.

<a id="m09"></a>

#### M09. Absence days by type per month (absence chart)

- **Definition**: working days per month for `sickness`, `compassionate`, `unpaid` and `other`.
  Annual leave and public holidays are left out (FR-013).
- **Sources**: `$type`, `displayName`, `start`, `end`, `datePart`, `duration`.
- **Formula**: Σ D1 fractions by category and month. `future` months: booked days for
  `compassionate`/`unpaid`/`other`, and the M13 forecast for `sickness`, each with its own
  `kind`.
- **Edge cases**: unknown `$type` → `other`. A mapping change re-categorises history at the
  next request. TOIL counts as `other` unless mapped.

<a id="m10"></a>

#### M10. Leavers per month (attrition chart)

- **Definition**: employees whose employment ended in the month, whatever the reason (FR-014).
- **Sources**: `employment.end`.
- **Formula**: count of employees in the group (D3 at `endDate`) with `endDate` in the month.
  Leavers with `endDate` ≤ today are `actual`. Leavers with `endDate` > today are `known`
  ("known leaver", serving notice; R9 point 6). The current month can have both.
- **Edge cases**: a leaver part-way through a month counts in headcount up to `endDate` (D6) and
  as a leaver that month. Known leavers are shown apart from the forecast.

<a id="m11"></a>

#### M11. Starters per month (attrition chart)

- **Definition**: employees whose employment started in the month.
- **Sources**: `employment.start`.
- **Formula**: count with `startDate` in the month (D3 at `startDate`). `startDate` ≤ today →
  `actual`. Later → `known`.
- **Edge cases**: a future starter isn't in headcount until their start date.

<a id="m12"></a>

#### M12. Monthly attrition rate % (attrition chart)

- **Definition**: leavers in the month ÷ the average of headcount at the start and end of the
  month × 100 (spec assumption).
- **Sources**: as M01 and M10.
- **Formula**: `actual` months: L ÷ ((D6(first day) + D6(last day)) ÷ 2) × 100. `toDate`: actual
  leavers to today ÷ ((D6(first day) + D6(today)) ÷ 2) × 100, labelled "to date". `future`: not
  shown (`null`). The chart shows known and forecast leavers instead.
- **Edge cases**: a denominator of 0 → `null` with "No staff in this group".

<a id="m13"></a>

#### M13. Forecast: sickness days and episodes

- **Definition**: for each `future` month, the mean of the monthly value over the last 12
  complete months, the same for every future month (FR-016).
- **Sources**: as M07 and M08.
- **Formula**: basis months = the 12 months before the current month whose coverage (D4) is
  `full`. If there are 3 or more, forecast = mean of M07 (or M08) over them, to 1 decimal place.
  With fewer than 3: `null`, with "Not enough history to forecast" (spec edge case). The
  response states how many basis months were used.
- **Edge cases**: at launch there will be fewer than 3 full months, so there is no forecast
  until enough history exists (R11). The forecast for a filter group uses D3 membership in each
  basis month.

<a id="m14"></a>

#### M14. Forecast: further leavers

- **Definition**: for each `future` month, the mean of monthly leavers over the last 12
  complete months, minus that month's known leavers, never below zero (FR-016).
- **Sources**: as M10.
- **Formula**: basis months = the 12 months before the current month in which the group's
  headcount at the start of the month was more than 0. If there are 3 or more:
  avg = mean of M10 (`actual`) over them, and furtherLeavers(m) = max(0, avg − known(m)).
  With fewer than 3: `null` with "Not enough history to forecast".
- **Edge cases**: known leavers above the average → 0. A new department with under 3 months →
  no forecast. Not limited by the 90-day absence window, if BrightHR answers B7 yes.

<a id="m15"></a>

#### M15. Who's off in Sales (list) and return date

- **Definition**: Sales employees absent today ("Today"), or at any point from tomorrow to
  today + 14 calendar days ("Upcoming") (FR-019, FR-020).
- **Sources**: `name.*`, `employment.jobTitle`, Entra `department`, absence fields,
  `reason.description`.
- **Formula**:
  - Sales = employees whose current `department` matches a `SalesDepartments` line, and who also
    match the role filter.
  - Today = their absences (not `publicHoliday`) whose AbsenceSpan includes today. Upcoming =
    those overlapping tomorrow … today + 14.
  - Each entry has: name; role; type label (`displayName`); sickness reason, if a reason is
    stored; start (date and part); end (date and part, or "Not yet known"); return date;
    status "Approved" (D7). Sorted by start date, then family name.
  - **Return date**: `nextWorkingDay(endDate)`. If `endPart` = `FirstHalf`, the return date is
    `endDate`, because the employee is back that afternoon. Open-ended → "Not yet known".
- **Edge cases**: nobody off → "Nobody in Sales is off". The department filter excludes all
  Sales departments → `outsideFilter: true` ("Sales is outside the current filter"). A
  `SalesDepartments` line that matches no current employee → listed in
  `departmentsNotFound`. Someone off today and tomorrow appears in both tabs.

<a id="m16"></a>

#### M16. Freshness

- **Definition**: whether the shown data is out of date (FR-023, FR-024).
- **Sources**: `HRD Sync Status`.
- **Formula** (with `now` passed in, in Europe/London):
  - `noDataYet` if `lastSuccessAt` is null.
  - Otherwise stale if any of these is true:
    - `lastAttemptOutcome` = `Failed` (`staleReason: lastAttemptFailed`);
    - `now` is within sync hours (working day, 07:00–19:59) and `now − lastSuccessAt` is more
      than the threshold: 2 hours, or 3 hours when `SYNC_DAYTIME_INTERVAL_HOURS` = 2 (FR-024)
      (`olderThanThreshold`);
    - `now` is outside sync hours and `lastSuccessAt` is before the most recent 02:00 run that
      is at least 30 minutes ago (`overnightMissed`).
- **Edge cases**: 07:00 on Monday after a good overnight run → fresh. 02:10 while the overnight
  run is in progress → judged against the previous night. A run still going (`Running`) isn't
  counted as failed.

---
