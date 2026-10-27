# Expected sickness days and episodes per month (M07, M08), worked out by hand

**Today**: 2026-10-27. Days are working days (D1), scaled to BrightHR's duration where one is
given. Episodes count in the month they start (D2). Pregnancy-related sickness **is** included
here; it's left out of the Bradford Factor only.

## Every sickness absence

| # | Person | Dates | Days | Starts an episode in |
|---|---|---|---|---|
| S01 | E08 | 14–15 Oct 2025 | 2 | Oct 2025 |
| S02 | E02 | 10–12 Nov 2025 | 3 | Nov 2025 |
| S03 | E10 | 8–9 Dec 2025, 900 minutes = 2 days | 2 | Dec 2025 |
| S04 | T03 | 15 Dec 2025 | 1 | Dec 2025 |
| S05 | E05 | 12–16 Jan 2026 | 5 | Jan 2026 |
| S06+S07 | E07 | Fri 6 + Mon 9 Feb 2026 (merged) | 2 | Feb 2026 (one episode) |
| S08 | T01 | 17–18 Feb 2026 | 2 | Feb 2026 |
| S09 | E13 | 23–25 Mar 2026 | 3 | Mar 2026 |
| S10 | E01 | 2–7 Apr 2026, no duration (Easter bank holidays excluded) | 2 | Apr 2026 |
| S11 | E09 | 11–13 May 2026, pregnancy-related | 3 | May 2026 |
| S12 | T04 | 18 May 2026 | 1 | May 2026 |
| S13 | E06 | Mon 29 Jun – Fri 3 Jul 2026 | Jun 2, Jul 3 | Jun 2026 |
| S14 | E04 | 20–21 Jul 2026 | 2 | Jul 2026 |
| S15 | E12 | 10–12 Aug 2026, duration 2 over 3 working days | 2 | Aug 2026 |
| S16 | E02 | 14–15 Sep 2026 | 2 | Sep 2026 |
| S17 | E11 | Mon 28 Sep – Fri 2 Oct 2026 | Sep 3, Oct 2 | Sep 2026 |
| S18 | E03 | From Thu 22 Oct 2026, open-ended: 22, 23, 26, 27 Oct | 4 | Oct 2026 |
| S19 | E08 | 27 Oct 2026, afternoon | 0.5 | Oct 2026 |

## The 7-month window (All)

| Month | Days | Episodes | Kind |
|---|---|---|---|
| Jul 2026 | **5** (S13 3 + S14 2) | **1** (S14) | actual |
| Aug 2026 | **2** | **1** | actual |
| Sep 2026 | **5** (S16 2 + S17 3) | **2** | actual |
| Oct 2026 | **6.5** (S17 2 + S18 4 + S19 0.5) | **2** (S18, S19) | toDate |
| Nov 2026 | **3.3** | **1.3** | forecast (M13, see forecast-sickness.md) |
| Dec 2026 | **3.3** | **1.3** | forecast |
| Jan 2027 | **3.3** | **1.3** | forecast |
