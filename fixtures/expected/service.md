# Expected length of service and work anniversaries (M17, M18), worked out by hand

**Today**: Tuesday 2026-10-27. **Data**: the synthetic fixtures (people listed in
[../README.md](../README.md)). Definitions: [docs/metric-catalogue.md](../../docs/metric-catalogue.md#m17).
These numbers were worked out by hand from the fixture table, not by running the code.

Displayed years are rounded to 1 decimal place, half away from zero (D8).

## Current staff

Employed on 2026-10-27 (D6): E01–E14. E12 Leo Brennan's last day is today, so he counts. E15
Olivia Grant starts 2026-11-16, so she doesn't. T01–T04 have left.

Days of service = calendar days from the start date to 2026-10-27. Each was counted as whole years
from the start date to its last anniversary (365 days a year, plus 1 for each 29 February inside
the span: 2016, 2020 and 2024 are leap years), plus the days from that anniversary to today.

| ID | Name | Department | Role | Start | Last anniversary | Completed years | Days | Band |
|---|---|---|---|---|---|---|---|---|
| E01 | Amelia Hart | Sales | Sales Team Manager | 2019-03-04 | 2026-03-04 | 7 | 2557 + 237 = **2794** | 5+ |
| E02 | Ben Okafor | Sales | Energy Analyst | 2021-06-01 | 2026-06-01 | 5 | 1826 + 148 = **1974** | 5+ |
| E03 | Chloe Patel | Sales | Senior Energy Analyst | 2021-12-01 | 2025-12-01 | 4 | 1461 + 330 = **1791** | 4–5 |
| E04 | Daniel Reyes | Sales | Energy Analyst | 2024-01-08 | 2026-01-08 | 2 | 731 + 292 = **1023** | 2–3 |
| E05 | Ella Novak | Pricing | Senior Pricing Specialist | 2018-05-21 | 2026-05-21 | 8 | 2922 + 159 = **3081** | 5+ |
| E06 | Finn Gallagher | Pricing | Senior Pricing Specialist | 2022-02-01 | 2026-02-01 | 4 | 1461 + 268 = **1729** | 4–5 |
| E07 | Grace Lindqvist | Analysis | Senior Energy Analyst | 2016-11-06 | 2025-11-06 | 9 | 3287 + 355 = **3642** | 5+ |
| E08 | Harry Mensah | Analysis | Energy Analyst | 2023-04-03 | 2026-04-03 | 3 | 1096 + 207 = **1303** | 3–4 |
| E09 | Isla Moreau | Analysis | Energy Analyst | 2025-02-10 | 2026-02-10 | 1 | 365 + 259 = **624** | 1–2 |
| E10 | Jacob Ferreira | Operations | Energy Analyst | 2022-08-15 | 2026-08-15 | 4 | 1461 + 73 = **1534** | 4–5 |
| E11 | Kara Whitfield | Operations | Senior Energy Analyst | 2016-01-11 | 2026-01-11 | 10 | 3653 + 289 = **3942** | 5+ |
| E12 | Leo Brennan | Analysis | Energy Analyst | 2024-09-02 | 2026-09-02 | 2 | 730 + 55 = **785** | 2–3 |
| E13 | Maya Sorensen | Not set | Energy Analyst | 2023-10-02 | 2026-10-02 | 3 | 1096 + 25 = **1121** | 3–4 |
| E14 | Noah Achebe | Not set | Senior Energy Analyst | 2021-01-04 | 2026-01-04 | 5 | 1826 + 296 = **2122** | 5+ |

Leap-day checks: E04's first year (2024-01-08 to 2025-01-08) holds 29 Feb 2024, so it's 366 days.
E07's span starts after 29 Feb 2016, so only 2020 and 2024 count. E11's span starts on 11 Jan 2016,
before 29 Feb 2016, so 2016, 2020 and 2024 all count. E12's span (Sep 2024 to Sep 2026) holds none.

## M17 Length of service

Years = days ÷ 365.25.

### All (E01–E14)

- Total days: 2794 + 1974 + 1791 + 1023 + 3081 + 1729 + 3642 + 1303 + 624 + 1534 + 3942 + 785 +
  1121 + 2122 = 27465.
- **Average**: 27465 ÷ 14 = 1961.79 days → 1961.79 ÷ 365.25 = 5.371 → **5.4 yrs**.
- **Median**: sorted days 624, 785, 1023, 1121, 1303, 1534, **1729, 1791**, 1974, 2122, 2794, 3081,
  3642, 3942. The 7th and 8th average to 1760 → 1760 ÷ 365.25 = 4.819 → **4.8 yrs**.
- **In first year**: **0**.

| Band | People | Count |
|---|---|---|
| Under 1 yr | none | **0** |
| 1–2 yrs | E09 | **1** |
| 2–3 yrs | E04, E12 | **2** |
| 3–4 yrs | E08, E13 | **2** |
| 4–5 yrs | E03, E06, E10 | **3** |
| 5+ yrs | E01, E02, E05, E07, E11, E14 | **6** |

### Department Sales (E01–E04)

- Average: (2794 + 1974 + 1791 + 1023) ÷ 4 = 7582 ÷ 4 = 1895.5 → 5.190 → **5.2 yrs**.
- Median: (1791 + 1974) ÷ 2 = 1882.5 → 5.154 → **5.2 yrs**.
- In first year: **0**. Bands: Under 1 **0**, 1–2 **0**, 2–3 **1** (E04), 3–4 **0**, 4–5 **1**
  (E03), 5+ **2** (E01, E02).

### Role Senior Energy Analyst (E03, E07, E11, E14)

- Average: (1791 + 3642 + 3942 + 2122) ÷ 4 = 11497 ÷ 4 = 2874.25 → 7.869 → **7.9 yrs**.
- Median: (2122 + 3642) ÷ 2 = 2882 → 7.891 → **7.9 yrs**.
- In first year: **0**. Bands: 4–5 **1** (E03), 5+ **3** (E07, E11, E14), all others **0**.

### Department Pricing (E05, E06; E15 hasn't started)

- Average: (3081 + 1729) ÷ 2 = 2405 → 6.585 → **6.6 yrs**. Median (two people): **6.6 yrs**.
- In first year: **0**. Bands: 4–5 **1** (E06), 5+ **1** (E05), all others **0**.

### Department Sales + role Senior Pricing Specialist

Nobody → **"No staff in this group"**, no figures.

## M18 Work anniversaries, 2026-10-27 to 2027-01-27

Each current or future employee's anniversary dates in the window:

| ID | Anniversary in window | Years then | Employed then? | Listed |
|---|---|---|---|---|
| E03 Chloe Patel | Tue 1 Dec 2026 | 5 (milestone) | yes | **yes** |
| E04 Daniel Reyes | Fri 8 Jan 2027 | 3 | yes | **yes** |
| E07 Grace Lindqvist | Fri 6 Nov 2026 | 10 (milestone) | yes | **yes** |
| E11 Kara Whitfield | Mon 11 Jan 2027 | 11 | no, leaves 2026-12-18 | no |
| E14 Noah Achebe | Mon 4 Jan 2027 | 6 | yes | **yes** |

Not in the window: E01 (4 Mar), E02 (1 Jun), E05 (21 May), E06 (1 Feb 2027, after 27 Jan), E08
(3 Apr), E09 (10 Feb), E10 (15 Aug), E12 (2 Sep, and leaves today), E13 (2 Oct, before today),
E15 (first anniversary 16 Nov 2027). T01–T04 have left.

| Filter | Entries, in order |
|---|---|
| All | Grace Lindqvist 10 yrs 2026-11-06 (milestone); Chloe Patel 5 yrs 2026-12-01 (milestone); Noah Achebe 6 yrs 2027-01-04; Daniel Reyes 3 yrs 2027-01-08 |
| Department Sales | Chloe Patel 5 yrs 2026-12-01 (milestone); Daniel Reyes 3 yrs 2027-01-08 |
| Role Senior Energy Analyst | Grace Lindqvist 2026-11-06; Chloe Patel 2026-12-01; Noah Achebe 2027-01-04 |
| Department Pricing | none → "No work anniversaries in the next 3 months" |
| Sales + Senior Pricing Specialist | none (section is "No staff in this group") |

The recheck the task asked for matches the planning list: four entries, Kara Whitfield left out.
