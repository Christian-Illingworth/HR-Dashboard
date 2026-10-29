# Feature Specification: Length of service and work anniversaries

**Feature Branch**: `002-length-of-service`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Length of service and work anniversaries: a new section on the HR Dashboard (adds to feature 001's dashboard). The approved mock shows a "Length of service" card. Subtitle: "Current staff · from BrightHR start dates · <filter>". Headline figures: average length of service (years, 1 dp), median length of service, and the number of staff in their first year. Left: a horizontal bar chart of current staff by service band with counts. The bands are Under 1 yr, 1–2 yrs, 2–3 yrs, 3–4 yrs, 4–5 yrs and 5+ yrs; the user's labels were "under 1yr, 2yr, 3yr, 4yr, 5yr and 5+yr", read as upper bounds. Right: "Work anniversaries · next 3 months", a scrolling list of current employees whose employment anniversary falls in the next 3 months. Every completed year counts (1, 5, 7, 10 …). Each row shows a years badge, given and family name, job title and the anniversary date (e.g. "Mon 2 Nov"), sorted by date. Milestone years (5, 10 …) have a stronger badge. Follows the department and role filters like other sections. Data: start dates are already synced; showing anniversary names means storing names for all current employees, not only Sales staff, which changes the data inventory and needs HR data owner sign-off (constitution Principle II). Use the design kit's colours and bar styles, not the Fluent blue in the mock. The names in the mock are made up."

This feature adds one section to the dashboard delivered by
[feature 001](../001-hr-dashboard/spec.md). Everything 001 requires of every view still applies:
access through the single access group (001 FR-002 to FR-005), "Last updated" and out-of-date
warnings (FR-023, FR-024), loading, empty and error states (FR-026), the "Mock data" label
(FR-029), the design kit and the SharePoint mobile app (FR-030), and WCAG 2.1 AA (FR-031).
References below to "001 FR-nnn" point to that spec.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See how long current staff have been here (Priority: P1)

An HR or Senior Leadership user opens the dashboard and, in a "Length of service" section, sees
the average and median length of service of current staff, how many are in their first year,
and how many fall in each service band: Under 1 yr, 1–2 yrs, 2–3 yrs, 3–4 yrs, 4–5 yrs and 5+ yrs.
They use it to judge how experienced a team is and how much of it is new.

**Why this priority**: it answers the main workforce-stability question with figures only, from
data the dashboard already holds, and needs no new personal data.

**Independent Test**: on sample data with a fixed "today", the three headline figures and the six
band counts match values worked out by hand, for the whole company and for one department.

**Acceptance Scenarios**:

1. **Given** the sample data and today = 27 Oct 2026, **When** a user opens the dashboard, **Then**
   the section shows the average and median length of service in years to one decimal place, the
   number of staff in their first year, and a count for each of the six bands, all matching the
   hand-worked values.
2. **Given** an employee who started on 27 Oct 2025, **When** today is 27 Oct 2026, **Then** they
   count in the 1–2 yrs band, not Under 1 yr.
3. **Given** an employee with a start date after today, **When** the section is shown, **Then**
   they are not counted anywhere in it.
4. **Given** an employee whose leaving date is today or later, **When** the section is shown,
   **Then** they still count, because they are still employed.
5. **Given** the bars, **When** a screen reader user reaches them, **Then** each band is read as
   its name and count, with the counts also written as text beside the bars.

---

### User Story 2 - See whose work anniversaries are coming up (Priority: P2)

The user sees a list headed "Work anniversaries · next 3 months" showing every current employee
whose employment anniversary falls between today and the same date 3 months ahead. Each entry
shows the number of years, the person's name and job title, and the date, earliest first.
Milestone anniversaries (every 5 years) stand out. HR uses it to plan recognition and to remind
managers.

**Why this priority**: it is valued but needs a new kind of stored data (names for every current
employee), which the HR data owner must approve first. Story 1 can ship without it.

**Independent Test**: on sample data with a fixed "today", the list contains exactly the
hand-worked set of people, years and dates, in date order.

**Acceptance Scenarios**:

1. **Given** today = 27 Oct 2026, **When** a user opens the dashboard, **Then** the list shows each
   current employee whose anniversary falls from 27 Oct 2026 to 27 Jan 2027 inclusive, with
   completed years, given and family name, job title and the date in the form "Mon 2 Nov", sorted
   by date and then by family name.
2. **Given** an employee reaching 5, 10, 15 (or any multiple of 5) years, **When** they are listed,
   **Then** their entry is marked as a milestone in a way that does not rely on colour alone.
3. **Given** an employee who started on 29 Feb 2024, **When** the next anniversary falls in a year
   without 29 February, **Then** it is shown on 28 February.
4. **Given** an employee whose leaving date is before their anniversary, **When** the list is shown,
   **Then** that anniversary is not listed.
5. **Given** an employee who started less than a year ago, **When** their first anniversary falls in
   the next 3 months, **Then** it is listed as "1 yr".
6. **Given** no anniversaries in the next 3 months for the current filter, **When** the list is
   shown, **Then** it says "No work anniversaries in the next 3 months".

---

### User Story 3 - Narrow the section with filters (Priority: P3)

The department and role filters narrow both halves of the section, as they do for the rest of
the dashboard. The subtitle names the current filter, for example "Current staff · from BrightHR
start dates · All departments".

**Why this priority**: consistency with the rest of the dashboard; the section is useful
unfiltered.

**Independent Test**: with the department filter set to one department in the sample data, the
figures, bands and list include only that department's current staff.

**Acceptance Scenarios**:

1. **Given** the department filter is "Sales", **When** the section is shown, **Then** its figures,
   bands and anniversaries cover Sales staff only, and the subtitle says so.
2. **Given** a picked month other than the current one, **When** the section is shown, **Then** it
   is unchanged, because it is always about current staff and the next 3 months from today.
3. **Given** a filter that matches nobody, **When** the section is shown, **Then** it says "No staff
   in this group" instead of figures, and the list shows its empty message.

---

### Edge Cases

- **Start date today**: counts as 0 years, in the Under 1 yr band and in "first year".
- **Exactly on a band boundary** (for example exactly 5 years today): the person moves into the
  higher band on their anniversary.
- **One employee in the group**: average and median are both that person's length of service.
- **Even number of employees**: the median is the mean of the two middle values.
- **Rejoiners**: length of service runs from the start date BrightHR holds; earlier spells of
  employment are not added.
- **Anniversary today**: listed, with today's date.
- **Several anniversaries on one day**: all listed, ordered by family name.
- **Very long list** (for example an unfiltered view of a large company): the list scrolls within
  the section and the page itself does not scroll sideways on a phone.
- **No name held** for an employee (data missing in BrightHR): the entry still shows, with job
  title and "Name not recorded".
- **Missing start date**: the employee is left out of the whole section and counted in the sync's
  existing skipped-records warning.

## Requirements *(mandatory)*

### Functional Requirements

**Length of service**

- **FR-001**: The dashboard MUST show a "Length of service" section covering current staff:
  people employed today (started on or before today, and not left before today).
- **FR-002**: Length of service MUST be measured from the employee's BrightHR employment start
  date to today, in years.
- **FR-003**: The section MUST show three headline figures: average length of service and median
  length of service, each in years to one decimal place, and the number of staff in their first
  year (under 1 completed year).
- **FR-004**: The section MUST show the number of current staff in each of six bands of completed
  years: Under 1 yr (0), 1–2 yrs (1), 2–3 yrs (2), 3–4 yrs (3), 4–5 yrs (4) and 5+ yrs (5 or
  more). Every current employee MUST fall in exactly one band.
- **FR-005**: The bands MUST be shown as horizontal bars with each band's name and count written
  beside its bar as text, readable by a screen reader as band and count. Because every value is
  shown as text, the bars need no tooltip and the list is their text equivalent (constitution
  Principle IV), instead of 001's chart tooltips and table view (001 FR-017, FR-018).

**Work anniversaries**

- **FR-006**: The section MUST list every work anniversary that falls from today to the same date
  3 months ahead, inclusive, for people who are employed on that anniversary date.
- **FR-007**: A work anniversary MUST be each yearly return of the start date, from the first
  onward. A start date of 29 February MUST be treated as 28 February in years without one.
- **FR-008**: Each entry MUST show the completed years on that date ("1 yr", "7 yrs"), the
  employee's given and family name, job title and the date (weekday, day and short month, for
  example "Mon 2 Nov"). Entries MUST be sorted by date, then family name.
- **FR-009**: Anniversaries that are a multiple of 5 years MUST be marked as milestones, visually
  and in text available to screen readers, not by colour alone.
- **FR-010**: The list MUST scroll within the section when it is longer than the space available,
  and MUST be usable by keyboard, screen reader and touch.

**Filters and scope**

- **FR-011**: The department and role filters MUST apply to the whole section, using each
  employee's current department and role. The section's subtitle MUST name the department filter
  in force ("All departments" or the department picked).
- **FR-012**: The month filter MUST NOT change the section; it is always relative to today, like
  the "today" KPIs (001 FR-022).
- **FR-013**: When the filter group has no current staff, the section MUST say "No staff in this
  group" rather than show zeros or an error. When there are no anniversaries in the next 3 months,
  the list MUST say "No work anniversaries in the next 3 months".

**Data protection**

- **FR-014**: To show names in the anniversary list, the dashboard MUST store the given and family
  name of every current employee, no longer only Sales staff. This MUST be recorded in the data
  inventory (purpose: work anniversaries; who can see it: the access group, through the
  dashboard) before names are synced, and the HR data owner MUST approve it. The approval MUST
  take the form of a setting that only the data administrators can change (001 FR-028), off by
  default. While it is off, only Sales staff's names are stored, the length-of-service figures
  still show, and the anniversary list says "Work anniversaries aren't switched on yet."
  Turning it off again MUST remove non-Sales names at the next sync.
- **FR-015**: A name MUST be removed from the stored copy at the first sync after the employee's
  employment ends. Leavers' names MUST NOT be kept for the 13-month history period.
- **FR-016**: Names MUST reach the browser only inside anniversary entries and the existing "Who's
  off in Sales" list, and only for people who are in those lists. The dashboard MUST NOT send a
  full staff list with names.
- **FR-017**: The section MUST NOT show or send any individual's start date or length of service
  except as the anniversary date and years in an anniversary entry.

**Sample data**

- **FR-018**: With a fixed "today" of 27 Oct 2026, the sample data MUST show the section with
  milestone and ordinary anniversaries in the next 3 months, a future starter, and a person
  serving notice whose anniversary falls after their leaving date, without changing any feature
  001 sample value. Cases that would change 001's values (someone under 1 year, a first
  anniversary, a 29 February start) MUST be covered by automated tests instead. All names MUST
  be made up.

### Key Entities *(include if feature involves data)*

- **Employee** (existing, from 001): gains a name held for every current employee rather than
  only Sales staff. Start date, leaving date, department and role are already held.
- **Service band**: one of the six ranges of completed years, with the count of current staff in
  it.
- **Work anniversary**: an employee, the date of the anniversary, the completed years on that
  date, and whether it is a milestone.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An HR or Senior Leadership user can read the average length of service and the
  number of staff in their first year within 10 seconds of opening the dashboard.
- **SC-002**: An HR user can find everyone with a work anniversary in the next 3 months, and which
  ones are milestones, within 30 seconds, without using BrightHR.
- **SC-003**: 100% of the section's figures, band counts and anniversary entries match values
  worked out by hand from the sample data.
- **SC-004**: In testing, no data response contains the name, start date or length of service of
  anyone who is not in a displayed anniversary or Sales entry, and the stored copy holds no name
  of anyone who left before the latest sync.
- **SC-005**: Adding the section keeps the dashboard within feature 001's speed targets (data
  within 5 seconds on office broadband and 10 seconds on 4G).
- **SC-006**: An accessibility audit of the section against WCAG 2.1 AA finds no failures, and the
  section works by touch in the SharePoint mobile app on a 360 px-wide screen.

## Assumptions

- **Bands**: the user listed "under 1yr, 2yr, 3yr, 4yr, 5yr and 5+yr". These are read as upper
  bounds: Under 1, 1–2, 2–3, 3–4, 4–5 and 5+ completed years, giving six bands with no overlap.
- **Years** for the average and median are worked out from days of service (days ÷ 365.25) and
  rounded half away from zero, as elsewhere in the dashboard (001 D8). Band and anniversary years
  are whole completed years.
- **Milestones** are every multiple of 5 years (5, 10, 15 …), as in the approved mock.
- **"Next 3 months"** runs from today to the same date 3 months later, inclusive (for example
  27 Oct 2026 to 27 Jan 2027). If that date doesn't exist, the month's last day is used.
- **Department and role** are the employee's current ones; past moves don't matter for a view of
  current staff.
- **Who can see it**: every member of the access group, like everything else on the dashboard
  (001 FR-002). There is no opt-out for individual employees in this release; if one is needed it
  becomes a setting later.
- **Placement**: the section sits below the attrition section, full width on desktop, with the
  chart above the list on phones.
- **Styling**: the design kit's colours, bar styles and badges are used, not the blue in the mock.
- **Dependency**: storing names for every current employee needs the HR data owner's approval,
  given by switching the setting on (FR-014). Until then, Story 1 works on live data and Story 2
  shows on sample data only.
- **Out of scope**: birthdays, notifications or emails about anniversaries, exporting the list,
  service history before the current BrightHR start date, and per-person service figures outside
  the anniversary list.
