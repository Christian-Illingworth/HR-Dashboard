# Expected values with filters (US7), worked out by hand

**Today**: 2026-10-27. Figures come from the tables in kpis.md, leave.md, sickness.md,
absence.md, attrition.md and sales.md, narrowed to the group. Each person's department and role
are taken on the day (D3).

## Role: Senior Energy Analyst (E03 Chloe, E07 Grace, E11 Kara, E14 Noah)

| Section | Expected |
|---|---|
| KPIs | Headcount 4. On leave 1 (E07's morning). Off sick 1 (E03). Attrition 0.0% (0 leavers, average headcount 4). Bradford 2.8. |
| Leave, Jul → Jan | 0, 0, 0, **0.5** (E07 on the morning of 27 Oct), 0, **5** (E11, 7–11 Dec), 0 |
| Sickness days, Jul → Oct | 0, 0, **3** (E11, 28–30 Sep), **6** (E11 1–2 Oct + E03 22–27 Oct) |
| Sickness episodes, Jul → Oct | 0, 0, 1, 1 |
| Sickness forecast | Basis Oct 2025 – Sep 2026: E07 Feb 2 days and 1 episode, E11 Sep 3 days and 1 episode. Days 5 ÷ 12 = 0.416… → **0.4**. Episodes 2 ÷ 12 = 0.166… → **0.2**. |
| Absence "other" | Oct **1** (E07 Study leave), Nov **10** (E14 Paternity leave) |
| Attrition | No leavers or starters Jul – Oct, so the rates are all 0.0%. Dec has **1 known leaver** (E11). The forecast average is 0 ÷ 12 = 0, so further leavers are **0**. |
| Sales list | Today: Chloe Patel. Upcoming: Chloe Patel. Ben and Daniel are Energy Analysts, so they're filtered out. |

## Department: Pricing (E05 Ella, E06 Finn; E15 Olivia from 16 Nov)

| Section | Expected |
|---|---|
| KPIs | Headcount **2** (E15 hasn't started). On leave 0. Off sick 0. |
| Sales list | `outsideFilter` **true**: "Sales is outside the current department filter." |
| Attrition | Nov has **1 known starter** (E15). |

## Month: May 2026 (All)

| Section | Expected |
|---|---|
| Window | **Feb – Aug 2026**, May selected, every month `actual`, no forecasts and no "to date". |
| Leave, Feb → Aug | **5** (E07, 16–20 Feb), 0, 0, **4** (E10, Tue 26 – Fri 29 May; Mon 25 May is a bank holiday), 0, 7, 7 |
| Sickness days, Feb → Aug | 4, 3, 2, 4, 2, 5, 2 |
| Sickness episodes, Feb → Aug | 2, 1, 1, 2, 1, 1, 1 |
| KPIs and Sales list | **Unchanged** from today's (FR-022): 14, 2, 2, 31.6%, 3.8; Chloe and Ben today. |

## Someone who changed department (E04 Daniel: Analysis until July 2026, Sales from August)

With the month set to Jul 2026, the window is Apr – Oct 2026.

| Filter | July sickness days | Why |
|---|---|---|
| Department Sales | **0** | Daniel's sickness on 20–21 Jul counts under Analysis, where he was then. |
| Department Analysis | **2** | Daniel's 20–21 Jul. E06's 29 Jun – 3 Jul is Pricing. |

The response also says `departmentHistoryStartMonth` = 2025-10, so the UI can explain that
months before then use the earliest values known.

## Options the API refuses (400 / badRequest)

- Month **2025-12**: it's more than 9 months before October 2026.
- Department **"Marketing"**: no current employee is in it.
- Role **"Chief Llama"**: no current employee has it.
