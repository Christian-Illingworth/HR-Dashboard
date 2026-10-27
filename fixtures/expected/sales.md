# Expected "Who's off in Sales" (M15), worked out by hand

**Today**: Tuesday 2026-10-27. **Upcoming range**: tomorrow (Wed 2026-10-28) to today + 14
(Tue 2026-11-10), inclusive. Definitions: [docs/metric-catalogue.md#m15](../../docs/metric-catalogue.md#m15).

## Who counts as Sales

Current Entra department "Sales" (the `SalesDepartments` setting), not left before today:

- E01 Amelia Hart, Sales Team Manager
- E02 Ben Okafor, Energy Analyst
- E03 Chloe Patel, Senior Energy Analyst
- E04 Daniel Reyes, Energy Analyst. He moved from Analysis in August 2026; his current department is Sales.

T02 Quinn Adeyemi is still "Sales" in Entra, but left on 2026-08-14, so he's not listed.

## Their absences (public holidays excluded)

| Person | Absence | Dates | Today? | Upcoming? |
|---|---|---|---|---|
| E01 | Sickness | 2 – 7 Apr 2026 | no | no |
| E01 | Annual leave | 30 Jul – 4 Aug 2026 | no | no |
| E01 | Annual leave | **16 – 20 Nov 2026** | no | **no** (starts 20 days from today, after 10 Nov) |
| E02 | Sickness | 10 – 12 Nov 2025 | no | no |
| E02 | TOIL | 24 Jul 2026 | no | no |
| E02 | Sickness | 14 – 15 Sep 2026 | no | no |
| E02 | Annual leave | **Mon 26 – Fri 30 Oct 2026** | **yes** | **yes** (28–30 Oct) |
| E03 | Sickness, reason "Back pain" | **Thu 22 Oct 2026, open-ended** | **yes** | **yes** (still open) |
| E04 | Sickness | 20 – 21 Jul 2026 | no | no |
| E04 | Annual leave | **Fri 6 Nov (afternoon) – Tue 10 Nov 2026 (morning)** | no | **yes** (starts 10 days from today) |

## Expected lists (sorted by start date, then family name)

**Today**

| Name | Role | Absence type | Sickness reason | Start | End | Return date | Status |
|---|---|---|---|---|---|---|---|
| Chloe Patel | Senior Energy Analyst | Sickness | Back pain | 2026-10-22 (FullDay) | Not yet known | Not yet known | Approved |
| Ben Okafor | Energy Analyst | Annual leave | none | 2026-10-26 (FullDay) | 2026-10-30 (FullDay) | **2026-11-02** (Friday → next working day, Monday) | Approved |

**Upcoming**

| Name | Role | Absence type | Sickness reason | Start | End | Return date | Status |
|---|---|---|---|---|---|---|---|
| Chloe Patel | Senior Energy Analyst | Sickness | Back pain | 2026-10-22 (FullDay) | Not yet known | Not yet known | Approved |
| Ben Okafor | Energy Analyst | Annual leave | none | 2026-10-26 (FullDay) | 2026-10-30 (FullDay) | 2026-11-02 | Approved |
| Daniel Reyes | Energy Analyst | Annual leave | none | 2026-11-06 (SecondHalf) | 2026-11-10 (FirstHalf) | **2026-11-10** (ends at midday, so back that afternoon) | Approved |

`pendingAvailable` is false: BrightHR lists approved absences only, so "Pending" can't appear yet.

## Filters and settings

| Case | Expected |
|---|---|
| Role Energy Analyst | Today: Ben Okafor. Upcoming: Ben Okafor, Daniel Reyes. |
| Role Sales Team Manager | Both lists empty and `outsideFilter` false, so the list shows "Nobody in Sales is off". Amelia's leave is 20 days away. |
| Department Pricing | `outsideFilter` true and both lists empty ("Sales is outside the current filter"). |
| Department Sales | Same as no filter. |
| `SalesDepartments` = "Sales" and "Sales Ops" | `departmentsNotFound` = ["Sales Ops"]. The lists are the same, since nobody is in "Sales Ops". |

## Sickness reasons kept by the sync (R13)

The rule: a sickness absence of a current Sales employee that overlaps today to today + 14 days,
or is open-ended.

- **Kept**: E03's open-ended sickness, "Back pain".
- **Not kept**:
  - E02's 14–15 Sep 2026 sickness has ended.
  - E04's 20–21 Jul 2026 sickness has ended.
  - E01's April sickness has ended.
  - E08's sickness today is outside Sales.
  - E09's pregnancy-related sickness in May is outside Sales and has ended.

Only one reason appears in the whole response: "Back pain", in the Sales list.
