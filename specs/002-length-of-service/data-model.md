# Data model: Length of service and work anniversaries (feature 002)

Changes to the data model of [feature 001](../001-hr-dashboard/data-model.md). Everything not
named here is unchanged.

## 1. Synced and stored data

No new BrightHR field is read. `employment.start`, `employment.end` and `name.*` are already in
001's allow-list.

| Record | Change |
|---|---|
| `EmployeeRecord.givenName`, `familyName` | Today: set only for Sales staff. Now: set for Sales staff, **and** for every employee employed on the sync date when the `AnniversaryNames` setting is `On`. Otherwise `null`. A non-Sales leaver's name becomes `null` at the first sync after their end date. Sales staff keep the 001 rule (a name while in a Sales department). The content hash changes, so the store rewrites the record. |
| `HRD Employees` list | No new columns: `GivenName` and `FamilyName` already exist. |
| `HRD Settings` | New key **`AnniversaryNames`**: `On` or `Off`. Missing, blank or anything else means `Off`. The synthetic `fixtures/settings.json` has `On`; the provisioning script adds it as `Off`. |
| `Settings` (core type) | New field `anniversaryNames: boolean`. |

### Data inventory change (`docs/data-inventory.md`)

The "Given and family name" row becomes:

| Data | Source | Purpose | Stored in | Who can see it | Kept for |
|---|---|---|---|---|---|
| Given and family name | `name.givenName`, `name.familyName` | Sales list; work anniversaries (only while `AnniversaryNames` is `On`) | HRD Employees | Function, Admins, Access group (Sales list and anniversary list only) | Sales staff: while in a Sales department (unchanged). Everyone else: while employed and `AnniversaryNames` is `On`; cleared at the first sync after leaving, or after the setting is turned `Off`. |

## 2. Metrics (add to `docs/metric-catalogue.md`)

Shared rules for both:
- **Current staff** = 001 D6 with `d` = today: started on or before today, and not left before
  today. Department and role filters use current values (001 D3 with `d` = today).
- **Completed years** `Y(e, d)` = the number of whole years from `startDate` to `d`. A year is
  complete on the start date's anniversary. A 29 February start date counts as 28 February in a
  year without one.

### M17. Length of service

- **Definition**: how long current staff in the filter group have been employed.
- **Sources**: `employment.start`, `employment.end`; Entra `department`; `employment.jobTitle`.
- **Formula**:
  - For each current employee `e`: `days(e)` = calendar days from `startDate` to today;
    `years(e)` = `days(e) ÷ 365.25`.
  - **Average** = mean of `years(e)`. **Median** = middle value of the sorted `years(e)`, or the
    mean of the two middle values for an even count. Both are rounded to 1 dp (001 D8).
  - **Bands**: count of `e` by `Y(e, today)`: 0 → Under 1 yr, 1 → 1–2 yrs, 2 → 2–3 yrs,
    3 → 3–4 yrs, 4 → 4–5 yrs, 5 or more → 5+ yrs.
  - **In first year** = the Under 1 yr count.
- **Edge cases**:
  - No current staff → "No staff in this group", and no figures.
  - Start date today → 0 years, Under 1 yr.
  - Exactly 1 year today → 1–2 yrs.
  - One employee → the average and the median are both their value.
  - Even count → the median is the mean of the middle two.
  - A leaver whose end date is today counts. A future starter doesn't.
  - A 29 February start, in a year without one, completes its year on 28 February.

### M18. Work anniversaries

- **Definition**: anniversaries of current staff in the filter group from today to 3 months
  ahead.
- **Sources**: as M17, plus `name.givenName`, `name.familyName`.
- **Formula**:
  - Window: today to `addMonthsClamped(today, 3)`, inclusive.
  - For each employee in the group (by current department and role) with `Y ≥ 1` on some date
    `a` in the window, where `a` is the anniversary of `startDate` (clamped for 29 February):
    list `{ date: a, years: Y(e, a), milestone: Y(e, a) mod 5 = 0 }`, if the employee is employed
    on `a` (started on or before it, and not left before it).
  - Sort by date, then family name, then given name.
  - Only when `AnniversaryNames` is on. Otherwise the list is switched off (see the contract).
- **Edge cases**:
  - Anniversary today → listed.
  - Leaving date before the anniversary → not listed. Leaving on the anniversary → listed.
  - A first anniversary → "1 yr".
  - A 29 February start → listed on 28 February in a year without one.
  - Several on one day → ordered by family name.
  - The window's end date doesn't exist (for example 30 Nov + 3 months) → the month's last day.
  - No name stored → listed with `name: null`, shown as "Name not recorded".
  - Nothing in the window → an empty list with the "No work anniversaries in the next 3 months"
    message.

## 3. The `service` section in `DashboardResponse`

```ts
interface ServiceBand { band: 'under1' | 'y1' | 'y2' | 'y3' | 'y4' | 'y5plus'; label: string; count: number }
interface AnniversaryEntry { name: string | null; role: string; date: IsoDate; years: number; milestone: boolean }
interface ServiceData {
  averageYears: number;    // 1 dp
  medianYears: number;     // 1 dp
  firstYear: number;
  bands: ServiceBand[];    // always six, in order
  anniversaries: { enabled: boolean; from: IsoDate; to: IsoDate; entries: AnniversaryEntry[] };
}
// sections.service: Section<ServiceData>
//   status 'empty' with message "No staff in this group" when the group has no current staff.
```

The `service` section depends on today only, never on the picked month (spec FR-012). The full
schema is in [contracts/dashboard-api-service.md](contracts/dashboard-api-service.md).
