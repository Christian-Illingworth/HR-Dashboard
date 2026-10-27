# Feature Specification: HR Dashboard

**Feature Branch**: `001-hr-dashboard`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Build an HR Dashboard for Consultiv Utilities Ltd, an energy consultancy. HR, leadership and the Sales Team Manager should be able to see leave, sickness, absence and staff attrition at a glance without logging into BrightHR. BrightHR is the source of truth for all employee, leave and absence data. The dashboard is opened from the company SharePoint intranet. Time window: every trend chart shows a rolling 7-month view: previous 3 months, current month (highlighted) and next 3 months. For October 2026 that is Jul–Sep 2026, Oct 2026, then Nov 2026–Jan 2027. Past months show actuals. Future leave shows booked leave, with approved and pending shown separately. Future sickness and attrition are forecasts based on recent trends and known leavers serving notice, clearly labelled "Forecast". Users see: 1. A KPI row: headcount, staff on leave today, staff off sick today, rolling 12-month attrition %, average Bradford Factor. 2. Leave chart: annual leave days per month, approved vs pending. 3. Sickness chart: sickness days and number of sickness episodes per month. 4. Absence chart: absence days per month by type (sickness, compassionate, unpaid, other). 5. Staff attrition chart: leavers and attrition rate % per month, with starters for comparison. 6. "Who's off in Sales": Sales team members who are off today or in the next 14 days. Show name, role, absence type, start date, end date, return date and status (Approved/Pending). Users can filter by today or upcoming. Department, role and date range filters update every chart and list. Access: HR and leadership see everything, including individual sickness reasons. Other users see totals and "Absent" only, never sickness reasons. The dashboard shows when data was last updated and offers a refresh. It has clear empty, loading and error states (e.g. when the BrightHR sync fails). Every chart has tooltips with exact values. Roles to use in sample data: Energy Analyst, Senior Energy Analyst, Senior Pricing Specialist, Sales Team Manager."

## Clarifications

### Session 2026-10-27

- Q: Who can open the dashboard? → A: Only HR and Senior Leadership. All of them see
  everything, including sickness reasons. Nobody else, including the Sales Team Manager, has
  access in this release.
- Q: What absence type would restricted users see in "Who's off in Sales"? → A: "Annual leave"
  for annual leave and "Absent" for every other type. Recorded for any future restricted access
  level; there are no restricted users in this release.
- Q: How does the date range filter work with the 7-month window? → A: The user picks a month,
  and the window becomes the 3 months before it, that month, and the 3 months after.
- Q: Should the Sales Team Manager be able to open the dashboard? → A: No. Access stays limited
  to HR and Senior Leadership.
- Q: Should attrition count all leavers, or only people who chose to leave? → A: All leavers,
  whatever the reason. The reason for leaving is not synced.
- Q: How should future months' sickness and leavers be forecast? → A: The average of the last
  12 complete months, as a flat line. Further leavers = that average minus known leavers for
  the month, never below zero.
- Q: Which people should "Who's off in Sales" include? → A: Everyone in a list of BrightHR
  department names held in settings, starting with just "Sales", changeable without code
  changes.
- Q: How often should the dashboard pull fresh data from BrightHR automatically? → A: Every
  hour from 07:00 to 19:00 UK time on working days, plus once overnight.
- Q: BrightHR has no department field, so where does an employee's department come from? →
  A: Their Entra ID (Microsoft 365) department, matched on email. The project owner decided
  this during planning. It replaces "BrightHR department names" in the earlier answer about
  "Who's off in Sales".
- Q: When should the dashboard treat an employee as a known future leaver who has handed in
  their notice? → A: When their BrightHR employment end date is set and is after today. They
  count as a known leaver in the month of that date.
- Q: How should "average headcount over the last 12 months" be worked out for the rolling
  12-month attrition KPI? → A: The mean of 13 headcounts, taken today and on the same date in
  each of the previous 12 months.
- Q: BrightHR only gives absences up to 90 days back, so at launch the history begins part-way
  through a month. Which months should the sickness forecast average? → A: Only complete
  months for which the dashboard holds full sickness data. With fewer than 3, there is no
  forecast.
- Q: Apart from the dashboard itself, who may open the stored copy of the synced data and
  change the dashboard's settings? → A: Two named data administrators: an HR data owner (Head
  of HR or a delegate) and one IT administrator.
- Q: If BrightHR's API rate limits turn out too tight for an hourly sync, what should the
  dashboard do instead? → A: Sync every 2 hours from 07:00 to 19:00 on working days, plus
  overnight, and move the "out of date" threshold from 2 hours to 3 hours.
- Q: BrightHR's API lists only approved absences. What should the dashboard show for pending
  leave? → A: Approved only, with "Pending: not available from BrightHR yet" where pending
  would appear, until BrightHR provides pending absences. Then FR-011 and FR-019 are revisited.
- Q: BrightHR records a length only for sickness and has no working pattern. How are leave
  and absence days counted? → A: Working days between the start and end dates (Monday to
  Friday, excluding England and Wales bank holidays, half days 0.5), using BrightHR's length
  for sickness where present. Part-time staff's leave is over-counted, and that is accepted.
- Q: How quickly must someone removed from the access group lose access? → A: Within 90
  minutes of removal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the headline numbers at a glance (Priority: P1)

An HR or Senior Leadership user opens the dashboard from the SharePoint intranet. Without logging
in to BrightHR, they see five headline numbers: headcount, staff on leave today, staff off sick
today, rolling 12-month attrition %, and average Bradford Factor. They also see when the data was
last updated.

**Why this priority**: this is the core promise: answering "how are we doing on people?" without
opening BrightHR. On its own it is a useful first release.

**Independent Test**: load the synthetic sample data, open the dashboard, and check that each of
the five numbers matches the value worked out by hand from the sample data for the same "today".

**Acceptance Scenarios**:

1. **Given** the sample data and a fixed "today", **When** an HR user opens the dashboard,
   **Then** the KPI row shows headcount, on leave today, off sick today, rolling 12-month
   attrition %, and average Bradford Factor, each matching the hand-calculated value.
2. **Given** the data was last synced at 09:00, **When** a user opens the dashboard, **Then** the
   dashboard shows "Last updated" with that date and time.
3. **Given** an employee is on approved annual leave for the morning only, **When** the KPI row
   loads, **Then** that employee is counted in "on leave today".

---

### User Story 2 - Only HR and Senior Leadership can see the dashboard (Priority: P1)

The dashboard holds individual sickness reasons, which are special category health data. Only
members of HR and Senior Leadership can open it, and they see everything. Anyone else who reaches
the page, or tries to get its data another way, gets no data at all.

**Why this priority**: showing health data to the wrong person is a UK GDPR breach, so access
must be right from the first release.

**Independent Test**: with the sample data, sign in as a member of the access group and as a
user outside it. Confirm the member sees the full dashboard, including sickness reasons, and the
other user sees only a "no access" message and receives no dashboard data, even when requesting
the data directly rather than through the page.

**Acceptance Scenarios**:

1. **Given** a user in the access group, **When** they open the dashboard, **Then** they see
   every section, and "Who's off in Sales" shows sickness reasons where recorded.
2. **Given** a user outside the access group, **When** they open the dashboard page, **Then**
   they see a message saying they do not have access and who to contact, and no employee data
   is sent to their device.
3. **Given** a user outside the access group, **When** they request dashboard data directly,
   without going through the page, **Then** the request is refused and no data is returned.
4. **Given** a user has been removed from the access group, **When** they open the dashboard
   or request its data 90 minutes or more after the removal, **Then** they are treated as
   outside the group.

---

### User Story 3 - See who is off in Sales (Priority: P2)

An HR or Senior Leadership user checks who in the Sales team is off today or in the next 14
days, to plan cover. Each entry shows name, role, absence type, start date, end date, return
date, and status (Approved or Pending). They can switch between "Today" and "Upcoming".

**Why this priority**: this answers a frequent day-to-day question, and it does not depend on
any trend charts.

**Independent Test**: with sample data containing Sales absences today, in 10 days, and in 20
days, check that "Today" shows only today's absences, "Upcoming" shows the next 14 days, and the
20-day absence is not listed.

**Acceptance Scenarios**:

1. **Given** a Sales Energy Analyst has approved annual leave from today to Friday, **When** the
   user selects "Today", **Then** the entry shows their name, role, absence type, start date, end
   date, return date (the next working day after the end date), and "Approved".
2. **Given** a Sales employee has pending leave starting in 10 days, **When** the user selects
   "Upcoming", **Then** the entry is listed with status "Pending". *(Blocked until BrightHR
   provides pending absences. Until then the list shows "Pending: not available from BrightHR
   yet"; see FR-019.)*
3. **Given** a Sales employee has leave starting in 20 days, **When** the user selects
   "Upcoming", **Then** the entry is not listed.
4. **Given** nobody in Sales is off in the selected period, **When** the list loads, **Then** it
   shows a clear "Nobody in Sales is off" message instead of an empty table.

---

### User Story 4 - Know whether the data can be trusted right now (Priority: P2)

A user can see when the data was last updated, ask for a refresh, and understand what is
happening when data is loading, missing, or out of date because the BrightHR sync failed.

**Why this priority**: numbers shown without their freshness can mislead. Users must know when
they are looking at old data.

**Independent Test**: simulate a successful sync, a failed sync, and a sync older than the
expected interval, and check that the dashboard shows the right message each time.

**Acceptance Scenarios**:

1. **Given** the dashboard is loading, **When** the user opens it, **Then** each section shows a
   loading state rather than blank space or zeros.
2. **Given** the last sync failed, **When** the user opens the dashboard, **Then** a clear
   message says the latest BrightHR update failed and shows when data was last successfully
   updated, and the most recent good data is still shown.
3. **Given** the user selects refresh, **When** the refresh completes, **Then** "Last updated"
   changes to the new time and every section shows the new data.
4. **Given** a refresh ran less than 15 minutes ago, **When** the user selects refresh again,
   **Then** they are told when the next refresh will be available.

---

### User Story 5 - See leave, sickness and absence trends (Priority: P3)

An HR or Senior Leadership user looks at three trend charts over the rolling 7-month window
(previous 3 months, current month highlighted, next 3 months): annual leave days split into
approved and pending; sickness days and sickness episodes; and absence days by type (sickness,
compassionate, unpaid, other). Past months show actuals, future leave shows booked leave, and
future sickness is a labelled forecast.

**Why this priority**: trends support planning and spotting problems, but the headline numbers
and the Sales list deliver value first.

**Independent Test**: with sample data and a fixed "today" of 2026-10-27, check that each chart
shows July 2026 to January 2027, October is highlighted, values match hand-calculated totals, and
future sickness is labelled "Forecast".

**Acceptance Scenarios**:

1. **Given** today is 2026-10-27, **When** the leave chart loads, **Then** it shows July 2026 to
   January 2027, with October 2026 highlighted.
2. **Given** booked annual leave in December, some approved and some pending, **When** the user
   views the leave chart, **Then** December shows approved and pending days as separate parts,
   told apart by label or pattern as well as colour. *(Blocked until BrightHR provides pending
   absences. Until then the chart shows approved days and the note "Pending: not available
   from BrightHR yet"; see FR-011.)*
3. **Given** future months on the sickness chart, **When** the user views it, **Then** those
   months are labelled "Forecast" and styled differently from actual months.
4. **Given** any chart, **When** the user hovers over, taps, or moves keyboard focus to a data
   point, **Then** a tooltip shows the exact value, the month, and whether it is actual, booked,
   or forecast.

---

### User Story 6 - See staff attrition and its forecast (Priority: P3)

A Senior Leadership user views leavers and attrition rate % per month over the same 7-month
window, with starters shown for comparison. Future months show leavers who have already given
notice, plus a labelled forecast based on recent trends.

**Why this priority**: attrition is a key leadership measure, but changes slowly, so it can follow
the operational views.

**Independent Test**: with sample data that includes a leaver serving notice until December,
check that December shows that leaver as a known leaver, that forecast values are labelled
"Forecast", and that past monthly attrition rates match hand calculation.

**Acceptance Scenarios**:

1. **Given** an employee has resigned with a leaving date in December 2026, **When** the user
   views the attrition chart, **Then** December includes them as a known leaver, shown apart from
   the trend-based forecast.
2. **Given** past months, **When** the user views the chart, **Then** each month shows leavers,
   starters, and the monthly attrition rate %, matching hand-calculated values.

---

### User Story 7 - Narrow the view with filters (Priority: P4)

A user filters by department, role, and month, and every chart, KPI, and list updates to match.

**Why this priority**: filters make the dashboard more useful for specific questions, but the
whole-company view comes first.

**Independent Test**: apply a department filter, a role filter, and an earlier month to the
sample data, and check that every section shows the right values for that group and window.

**Acceptance Scenarios**:

1. **Given** the role filter is set to "Senior Energy Analyst", **When** the filters apply,
   **Then** every KPI, chart, and list includes only employees in that role.
2. **Given** the department filter excludes Sales, **When** the user views "Who's off in Sales",
   **Then** it explains that Sales is outside the current filter instead of showing an empty list.
3. **Given** today is 2026-10-27 and the user picks May 2026, **When** the filters apply,
   **Then** every trend chart shows February to August 2026 as actuals, with May highlighted,
   and the "today" KPIs and "Who's off in Sales" still show today's figures.

---

### Edge Cases

- **Current month is part-way through**: the current month shows actuals to date plus leave
  already booked for the rest of the month, and is labelled "to date".
- **Absence spans two months**: days are split between the months they fall in. A sickness
  episode is counted once, in the month it starts.
- **Open-ended sickness** (no end date yet): end date and return date show "Not yet known".
- **Half days**: count as 0.5 days in day totals, and the person counts as on leave or off sick
  for "today" figures.
- **Weekends and bank holidays**: are not counted as leave or absence days.
- **Employee changes department or role**: past months use the department and role the employee
  had at the time; current and future months use their current ones. No history exists before
  the dashboard's first sync, so months before it use the earliest department and role known,
  and the dashboard says so.
- **Leaver part-way through the window**: is included in headcount up to their leaving date and
  in leavers for the month they leave.
- **Starter with a future start date**: is not in headcount until their start date, and appears
  as a starter in their start month.
- **Zero headcount in a filtered group**: attrition % and average Bradford Factor show "No staff
  in this group" rather than 0 or an error.
- **A Sales department name in settings doesn't match any Entra ID department** (for example,
  after a rename): "Who's off in Sales" says which name was not found, rather than silently
  showing nobody.
- **Less than 12 months of history for the filtered group** (for example, a new department):
  the forecast averages the complete months available. With fewer than 3, no forecast is shown,
  and the chart says there is not enough history to forecast.
- **Picked month near the edge of kept history**: the month picker offers only months whose
  whole window is covered by kept history (see FR-021).
- **First months after launch**: BrightHR provides absences only up to 90 days back, so the
  dashboard has no absence data before about 90 days before its first sync. It keeps every
  absence it syncs from then on, for the retention period. Months with no or only part data
  are marked on the charts ("No absence data before <date>"). The sickness forecast appears
  once 3 complete months are held, and the month picker offers more months as history builds
  up. Until 52 weeks are held, the average Bradford Factor uses the data held and says
  "Based on data since <date>".
- **User is in the access group but cannot open the SharePoint page** (or the reverse): the
  two are managed from one group, so this only happens through misconfiguration. The data stays
  protected either way, because data access is checked separately from page access (FR-004).
- **Pending leave later rejected or cancelled**: disappears from charts and lists at the next
  sync.
- **First sync has not happened yet**: the dashboard shows a "No data yet" state, not zeros.
- **BrightHR returns an absence type the dashboard does not recognise**: it is counted under
  "Other".
- **Mock data mode is on**: every view shows a clear "Mock data" label.

## Requirements *(mandatory)*

### Functional Requirements

**Access and data protection**

- **FR-001**: Users MUST open the dashboard from the company SharePoint intranet using their
  existing Microsoft 365 sign-in, with no separate login and no need to log in to BrightHR.
- **FR-002**: Only members of a single access group for HR and Senior Leadership MUST be able to
  use the dashboard. Every member sees everything, including individual sickness reasons.
- **FR-003**: HR or IT MUST manage the access group's membership in Microsoft 365, outside the
  dashboard. The same group MUST control both who can open the dashboard page and who can
  receive its data, so access is granted or removed in one place. Removing someone from the
  group MUST stop them receiving dashboard data within 90 minutes.
- **FR-004**: Page permissions alone MUST NOT be relied on. Every request for dashboard data
  MUST check that the user is in the access group, and requests from anyone else MUST be refused
  with no data returned.
- **FR-005**: A user outside the access group who reaches the page MUST see a clear message that
  they do not have access, and who to contact.
- **FR-006**: Sickness reasons MUST appear only in the "Who's off in Sales" list.

**KPI row**

- **FR-007**: The dashboard MUST show a KPI row with: headcount today; number of staff on
  approved leave today; number of staff off sick today; rolling 12-month attrition %; and average
  Bradford Factor.
- **FR-008**: Rolling 12-month attrition % MUST be the number of leavers in the last 12 months
  divided by the average headcount over those 12 months, times 100. The average headcount is
  the mean of 13 headcounts, taken today and on the same date in each of the previous 12
  months; when that date doesn't exist in a month (for example 31 September), the month's last
  day is used. "Leavers" means everyone
  whose employment ended, whatever the reason (resignation, dismissal, redundancy, or end of a
  fixed-term contract). The reason for leaving MUST NOT be synced.
- **FR-009**: Average Bradford Factor MUST be the mean of each current employee's Bradford Factor
  (S² × D, where S is the number of sickness episodes and D the total sickness days in the last
  52 weeks), including employees with a score of 0.

**Trend charts**

- **FR-010**: Every trend chart MUST show a 7-month window: the 3 months before the selected
  month, the selected month (visually highlighted), and the 3 months after. The selected month
  MUST default to the current month and move forward on the first day of each month.
- **FR-011**: The leave chart MUST show annual leave days per month, with approved and pending
  days shown separately. Past months show leave taken; future months show leave booked. While
  BrightHR does not provide pending absences, the chart MUST show approved days only, with the
  note "Pending: not available from BrightHR yet".
- **FR-012**: The sickness chart MUST show sickness days and the number of sickness episodes per
  month. Past months and the current month to date show actuals; future months show a forecast.
- **FR-013**: The absence chart MUST show absence days per month by type: sickness,
  compassionate, unpaid, and other. Annual leave is not included. Future months show booked
  absences plus forecast sickness.
- **FR-014**: The attrition chart MUST show leavers, starters, and the monthly attrition rate %
  per month. Future months MUST show known leavers, known starters (with a future start date),
  and a trend-based forecast of further leavers, kept visually separate. A known leaver is an
  employee whose BrightHR employment end date is after today. They are counted in the month of
  that date, whatever the reason for leaving.
- **FR-015**: Every forecast value MUST be labelled "Forecast" and styled differently from actual
  values in a way that does not rely on colour alone.
- **FR-016**: Each future month's forecast MUST be the monthly average over the last 12
  complete months, the same for every future month in the window. This applies to sickness
  days, sickness episodes, and leavers. For sickness days and sickness episodes, only complete
  months for which the dashboard holds full sickness data count; a month only partly covered by
  synced history is left out. For leavers, the forecast of further leavers MUST be that average
  minus the known leavers for the month, never below zero. The method MUST be recorded in the
  metric catalogue.
- **FR-017**: Every chart MUST show tooltips with the exact value, the month, and whether the
  value is actual, booked, or forecast. Tooltips MUST work with mouse, touch, and keyboard.
- **FR-018**: Every chart MUST have an equivalent table view that keyboard and screen reader
  users can reach.

**Who's off in Sales**

- **FR-019**: "Sales" MUST mean every employee whose Entra ID department is in a list of
  department names held in settings, starting with just "Sales". The data administrators
  (FR-028) MUST be able to change the list without code changes. The dashboard MUST list Sales
  employees who are absent today ("Today") or on any day from tomorrow to 14 calendar days from
  today ("Upcoming"), with name, role, absence type (with the sickness reason where recorded),
  start date, end date, return date, and status (Approved or Pending). While BrightHR does not
  provide pending absences, every entry is "Approved" and the list notes "Pending: not available
  from BrightHR yet". Users MUST be able to switch between "Today" and "Upcoming". Someone off
  both today and later appears in both.
- **FR-020**: Return date MUST be the employee's next working day after the absence ends. If the
  absence ends with a morning-only half day, the return date is that same day.

**Filters**

- **FR-021**: Users MUST be able to filter by department, role, and month, and every KPI, chart,
  and list MUST update to match. Picking a month MUST move every trend chart's window so the
  picked month is in the centre. Users MUST be able to pick any month from 9 months before the
  current month up to the current month, as long as kept history covers that month's whole
  window; the current month can always be picked (see the edge cases on kept history and the
  first months after launch). Months before the current month show actuals only;
  forecasts appear only for months after the current month.
- **FR-022**: "Today" KPIs and the "Who's off in Sales" list MUST always be relative to today,
  whatever month is picked.

**Freshness, refresh, and states**

- **FR-023**: Every view MUST show when data was last successfully updated from BrightHR.
- **FR-024**: Data MUST be updated from BrightHR automatically every hour from 07:00 to 19:00
  UK time on working days, plus once overnight. "Sync hours" means 07:00 to 19:59 UK time on
  working days. The dashboard MUST say the data
  is out of date, and keep showing the most recent good data, when: the last attempt failed; or,
  during sync hours, the last successful update is more than 2 hours old; or, outside sync
  hours, the overnight update has not succeeded. If BrightHR's rate limits can't support an
  hourly sync, the daytime sync MUST be switchable by configuration, not code, to every 2 hours
  over the same sync hours. The out-of-date threshold then becomes 3 hours.
- **FR-025**: Users MUST be able to request a refresh. Refreshes MUST be limited to one every 15
  minutes across all users, and the user MUST be told when the next one is available.
- **FR-026**: Every section MUST have distinct loading, empty, and error states. A failure in
  one section MUST NOT blank the rest of the dashboard.

**Data, sample mode, and platform**

- **FR-027**: BrightHR MUST be the only source of employee, leave, and absence data. The
  dashboard MUST NOT change any data in BrightHR.
- **FR-028**: The dashboard MUST copy only the BrightHR fields that these views need, each listed
  in the data inventory with its purpose, who can see it, and how long it is kept. Only the
  dashboard's back end and two named data administrators, an HR data owner (Head of HR or a
  delegate) and one IT administrator, MUST be able to open the stored copy or change the
  dashboard's settings. Members of the access group see the data only through the dashboard.
- **FR-029**: The dashboard MUST be able to run on synthetic sample data in the same shape as
  BrightHR data, with a clear "Mock data" label on every view. The sample data MUST use the
  roles Energy Analyst, Senior Energy Analyst, Senior Pricing Specialist, and Sales Team Manager,
  and MUST include a Sales department.
- **FR-030**: The dashboard MUST follow the Consultiv Utilities web design kit
  (`design-kit/DESIGN.md`) and work in the SharePoint mobile app on phones.
- **FR-031**: The dashboard MUST meet WCAG 2.1 AA, and colour MUST never be the only way
  information is shown.

### Key Entities *(include if feature involves data)*

- **Employee**: a person in BrightHR. Key attributes: name, department (from Entra ID), role,
  start date, and leaving date (if any; a leaving date after today means they are serving
  notice). BrightHR has no working pattern. Department and role history is needed to report
  past months correctly.
- **Absence**: a period an employee is away. Key attributes: employee, type (annual leave,
  sickness, compassionate, unpaid, or other), start and end date, half-day flags, length in days
  (recorded by BrightHR for sickness only), and status (approved or pending; BrightHR currently
  provides approved absences only). Sickness absences may also have a reason, which is special
  category health data.
- **Sickness episode**: one continuous sickness absence, used for episode counts and the
  Bradford Factor.
- **Monthly figures**: the totals for one month in the window, each marked as actual, booked, or
  forecast.
- **Sync record**: when data was last pulled from BrightHR, and whether it worked.
- **Access group**: the Microsoft 365 group of HR and Senior Leadership members who may use the
  dashboard.
- **Data administrator**: one of two named people (the HR data owner and one IT administrator)
  who may open the stored copy of synced data and change the dashboard's settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An HR or Senior Leadership user can read all five headline numbers within 10
  seconds of opening the dashboard.
- **SC-002**: The dashboard shows its data within 5 seconds of opening on a typical office
  connection, and within 10 seconds in the SharePoint mobile app on 4G.
- **SC-003**: 100% of KPI, chart, and list values match the values worked out by hand from the
  sample data.
- **SC-004**: In testing, a user outside the access group receives zero employee records from
  any page or data request.
- **SC-005**: During sync hours (FR-024), users never see data older than the out-of-date
  threshold (2 hours, or 3 hours on the 2-hourly fallback) without a visible warning.
- **SC-006**: An HR or Senior Leadership user can find who in Sales is off in the next 14 days
  within 30 seconds, without using BrightHR.
- **SC-007**: An accessibility audit against WCAG 2.1 AA finds no failures, and every view works
  in the SharePoint mobile app.
- **SC-008**: Within one month of launch, HR and Senior Leadership confirm they answer routine
  leave, sickness, and attrition questions from the dashboard instead of logging in to BrightHR.

## Assumptions

- **Access** is limited to one Microsoft 365 group covering HR and Senior Leadership, which HR
  or IT maintain. Who belongs in "Senior Leadership" is decided by the business, not the
  dashboard.
- **Restricted access** (users who see totals but not sickness details) is not part of this
  release. If it is added later, restricted users see "Annual leave" for annual leave and
  "Absent" for every other absence type, never sickness reasons, and sickness figures for small
  groups are hidden from them (decided 2026-10-27).
- **Department** comes from each employee's Entra ID record, matched to BrightHR on email,
  because BrightHR has no department field. Employees with no match or no department are
  grouped as "Not set".
- **Working days** are Monday to Friday, excluding bank holidays in England and Wales.
- **Retention**: synced data is kept for 13 months of history (enough for the rolling 12-month
  attrition rate, the 52-week Bradford Factor, and the earliest pickable month) plus future
  bookings. Older records, including leavers' details, are removed.
- **Headcount** counts people, not full-time equivalents.
- **Monthly attrition rate** is leavers in the month (as defined in FR-008) divided by the
  average of the headcount at the start and end of the month, times 100.
- **Bradford Factor** counts sickness absences only. Pregnancy-related sickness is left out,
  because UK law treats it separately. BrightHR has no pregnancy flag, so a sickness absence
  counts as pregnancy-related when its BrightHR sickness reason is in a list of reasons held in
  settings. Only the average is shown, never individual scores.
- **Leave and absence days** are counted as working days between the start and end dates, with
  half days as 0.5, because BrightHR records a length only for sickness. Sickness uses
  BrightHR's recorded length where present. BrightHR has no working pattern, so leave of
  part-time staff is over-counted. This is an accepted, documented limit (decided 2026-10-27).
- **"On leave today"** counts approved annual leave only. Pending leave and other absence types
  are not included.
- **"Other" absence type** covers every type that is not annual leave, sickness, compassionate,
  or unpaid (for example, parental leave or jury service).
- **Live BrightHR access** is not yet confirmed. The first release is built and demonstrated on
  sample data, as the constitution's mock-first principle requires.
- **Out of scope**: access for anyone outside HR and Senior Leadership (including the Sales Team
  Manager), exporting data, editing anything in BrightHR, notifications or alerts, individual
  Bradford Factor scores, and individual employee views beyond "Who's off in Sales".
