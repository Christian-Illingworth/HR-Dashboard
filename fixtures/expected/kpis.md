# Expected KPI values (M01–M05), worked out by hand

**Today**: Tuesday 2026-10-27. **Data**: the synthetic fixtures (people listed in
[../README.md](../README.md)). Definitions: [docs/metric-catalogue.md](../../docs/metric-catalogue.md).
These numbers were worked out by hand from the fixture tables, not by running the code.

Displayed values are rounded to 1 decimal place, half away from zero (D8).

## M01 Headcount today

Employed on 2026-10-27 = started on or before it, and no end date or an end date on or after it.

- E01–E14 are employed. E12 Leo Brennan's last day is today, so he counts.
- E15 Olivia Grant starts 2026-11-16, so she doesn't count. T01–T04 have all left.

| Filter | People | Headcount |
|---|---|---|
| All | E01–E14 | **14** |
| Department Sales | E01, E02, E03, E04 | **4** |
| Role Senior Energy Analyst | E03, E07, E11, E14 | **4** |
| Department Sales + role Senior Pricing Specialist | none | **0** |

## M02 On leave today

Approved annual leave covering 2026-10-27, half days included:

- E02 Ben Okafor: annual leave Mon 26 – Fri 30 Oct (Sales, Energy Analyst).
- E07 Grace Lindqvist: annual leave on the morning of 27 Oct only (Analysis, Senior Energy Analyst).
- Not counted: E08 is off sick in the afternoon, which is sickness, not leave. The bank holiday record (E10, 31 Aug) is not today.

| Filter | Who | Value |
|---|---|---|
| All | E02, E07 | **2** |
| Sales | E02 | **1** |
| Senior Energy Analyst | E07 | **1** |
| Sales + Senior Pricing Specialist | none | **0** |

## M03 Off sick today

Sickness covering 2026-10-27:

- E03 Chloe Patel: open-ended sickness since Thu 22 Oct (Sales, Senior Energy Analyst).
- E08 Harry Mensah: sickness on the afternoon of 27 Oct (Analysis, Energy Analyst).

| Filter | Who | Value |
|---|---|---|
| All | E03, E08 | **2** |
| Sales | E03 | **1** |
| Senior Energy Analyst | E03 | **1** |
| Sales + Senior Pricing Specialist | none | **0** |

## M04 Rolling 12-month attrition %

Period P is 2025-10-28 to 2026-10-27, both inclusive.

**Leavers in P** (end date in P, any reason):

| Person | End date | Department at end (history row) |
|---|---|---|
| T03 Ruth Castellano | 2025-12-19 | Pricing |
| T01 Priya Kaur | 2026-02-27 | Analysis |
| T04 Sam Whitaker | 2026-05-29 | Operations |
| T02 Quinn Adeyemi | 2026-08-14 | Sales |
| E12 Leo Brennan | 2026-10-27 | Analysis |

**Headcount at the 13 dates** (today − k months, k = 0…12):

- E01–E14 are employed on every date. That's 14, with E12 counted on 2026-10-27 because it's his last day.
- T01 is employed until 2026-02-27. T02 until 2026-08-14.
- T03 is employed until 2025-12-19. T04 from 2025-11-03 to 2026-05-29.

| Date | E01–E14 | T01 | T02 | T03 | T04 | All |
|---|---|---|---|---|---|---|
| 2025-10-27 | 14 | 1 | 1 | 1 | 0 | 17 |
| 2025-11-27 | 14 | 1 | 1 | 1 | 1 | 18 |
| 2025-12-27 | 14 | 1 | 1 | 0 | 1 | 17 |
| 2026-01-27 | 14 | 1 | 1 | 0 | 1 | 17 |
| 2026-02-27 | 14 | 1 | 1 | 0 | 1 | 17 |
| 2026-03-27 | 14 | 0 | 1 | 0 | 1 | 16 |
| 2026-04-27 | 14 | 0 | 1 | 0 | 1 | 16 |
| 2026-05-27 | 14 | 0 | 1 | 0 | 1 | 16 |
| 2026-06-27 | 14 | 0 | 1 | 0 | 0 | 15 |
| 2026-07-27 | 14 | 0 | 1 | 0 | 0 | 15 |
| 2026-08-27 | 14 | 0 | 0 | 0 | 0 | 14 |
| 2026-09-27 | 14 | 0 | 0 | 0 | 0 | 14 |
| 2026-10-27 | 14 | 0 | 0 | 0 | 0 | 14 |
| **Sum** | | | | | | **206** |

**All**:
- H̄ = 206 ÷ 13 = 15.846… (shown as 15.8).
- Attrition = 5 ÷ (206 ÷ 13) × 100 = 65 ÷ 206 × 100 = 31.553… → **31.6%**, with 5 leavers.

**Department Sales**: membership uses each date's history row (D3).
- E01, E02 and E03 are Sales throughout.
- E04 is Analysis until July 2026 and Sales from August 2026.
- T02 is Sales until 2026-08-14.

Per date:
- 2025-10-27 to 2026-07-27 (10 dates): E01, E02, E03, T02 = 4 each, so 40.
- 2026-08-27, 2026-09-27, 2026-10-27: E01, E02, E03, E04 = 4 each, so 12.

Sum = 52, so H̄ = 4. The only Sales leaver in P is T02, so L = 1. Attrition = 1 ÷ 4 × 100 = **25.0%**.

**Role Senior Energy Analyst**: E03, E07, E11 and E14 are employed on all 13 dates, so H̄ = 4. No
Senior Energy Analyst left in P, so L = 0. Attrition = **0.0%**.

**Sales + Senior Pricing Specialist**: nobody on any date, so H̄ = 0. The result is **"No staff in
this group"** (`noStaff: true`, percent `null`), with 0 leavers.

## M05 Average Bradford Factor

The basis period B is the 364 days ending today: **2025-10-29 to 2026-10-27**.
`historyStartDate` is 2025-10-01, which is earlier, so the basis isn't partial.

For each current employee (M01 group), S = episodes with a day in B, not pregnancy-related, and
D = sickness days in B. Day counts follow D1.

| Person | Sickness in B | S | D | S² × D |
|---|---|---|---|---|
| E01 | Thu 2 – Tue 7 Apr 2026, no duration: 2 working days (Good Friday and Easter Monday excluded) | 1 | 2 | 2 |
| E02 | 10–12 Nov 2025 (3 days); 14–15 Sep 2026 (2 days) | 2 | 5 | 20 |
| E03 | Open-ended from Thu 22 Oct 2026: 22, 23, 26, 27 Oct | 1 | 4 | 4 |
| E04 | 20–21 Jul 2026 | 1 | 2 | 2 |
| E05 | 12–16 Jan 2026 | 1 | 5 | 5 |
| E06 | 29 Jun – 3 Jul 2026 | 1 | 5 | 5 |
| E07 | Fri 6 Feb + Mon 9 Feb 2026, merged into one episode (D2) | 1 | 2 | 2 |
| E08 | 14–15 Oct 2025 is before B, so excluded. Afternoon of 27 Oct 2026 = 0.5 | 1 | 0.5 | 0.5 |
| E09 | 11–13 May 2026 is pregnancy-related, so excluded | 0 | 0 | 0 |
| E10 | 8–9 Dec 2025, 900 minutes ÷ (7.5 × 60) = 2 days | 1 | 2 | 2 |
| E11 | 28 Sep – 2 Oct 2026 | 1 | 5 | 5 |
| E12 | 10–12 Aug 2026, BrightHR duration 2 days | 1 | 2 | 2 |
| E13 | 23–25 Mar 2026 | 1 | 3 | 3 |
| E14 | none | 0 | 0 | 0 |
| | | | | **52.5** |

| Filter | People | Sum | N | Average |
|---|---|---|---|---|
| All | E01–E14 | 52.5 | 14 | 3.75 → **3.8** |
| Sales | E01, E02, E03, E04 | 2 + 20 + 4 + 2 = 28 | 4 | **7.0** |
| Senior Energy Analyst | E03, E07, E11, E14 | 4 + 2 + 5 + 0 = 11 | 4 | 2.75 → **2.8** |
| Sales + Senior Pricing Specialist | none | | 0 | **"No staff in this group"** |

`basisStartDate` is 2025-10-29 and `basisIsPartial` is false.

**Launch scenario** (`historyStartDate` 2026-07-29): B becomes 2026-07-29 to 2026-10-27,
`basisStartDate` 2026-07-29 and `basisIsPartial` true.

| Person | Sickness in B | S | D | S² × D |
|---|---|---|---|---|
| E02 | 14–15 Sep | 1 | 2 | 2 |
| E03 | 22–27 Oct | 1 | 4 | 4 |
| E08 | 27 Oct afternoon | 1 | 0.5 | 0.5 |
| E11 | 28 Sep – 2 Oct | 1 | 5 | 5 |
| E12 | 10–12 Aug | 1 | 2 | 2 |
| Everyone else | E04's 20–21 Jul and E06's 29 Jun – 3 Jul are before 29 Jul | 0 | 0 | 0 |

The sum is 2 + 4 + 0.5 + 5 + 2 = 13.5. The average over 14 people is 0.964… → **1.0**.

## Last updated (US1 scenario 2)

`lastSuccessAt` is 2026-10-27T09:00:00Z. BST ended on 25 Oct 2026, so that's **27 Oct 2026, 09:00**
UK time (GMT).
