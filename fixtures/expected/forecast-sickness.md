# Expected sickness forecast (M13), worked out by hand

The basis months are the 12 months before the current month (Oct 2025 – Sep 2026) whose coverage
is `full`. The forecast is the mean of their values, the same for every future month.

## With history from 2025-10-01 (the mock data)

All 12 basis months are `full`. Monthly values, from sickness.md:

| Month | Days | Episodes |
|---|---|---|
| Oct 2025 | 2 | 1 |
| Nov 2025 | 3 | 1 |
| Dec 2025 | 3 (S03 2 + S04 1) | 2 |
| Jan 2026 | 5 | 1 |
| Feb 2026 | 4 (S06+S07 2 + S08 2) | 2 (the merged pair counts once) |
| Mar 2026 | 3 | 1 |
| Apr 2026 | 2 | 1 |
| May 2026 | 4 (S11 3 + S12 1) | 2 |
| Jun 2026 | 2 (S13's first two days) | 1 |
| Jul 2026 | 5 | 1 |
| Aug 2026 | 2 | 1 |
| Sep 2026 | 5 | 2 |
| **Total** | **40** | **16** |

- Days forecast = 40 ÷ 12 = 3.333… → **3.3**.
- Episodes forecast = 16 ÷ 12 = 1.333… → **1.3**.
- `forecastBasisMonths` = 12, and `notEnoughHistory` is false.

## Department Sales (membership per basis month, D3)

Sales sickness in Oct 2025 – Sep 2026, taking each person's department on the day:
- E02, 10–12 Nov 2025: 3 days, 1 episode.
- E01, 2–7 Apr 2026: 2 days, 1 episode.
- E02, 14–15 Sep 2026: 2 days, 1 episode.
- E04's 20–21 Jul 2026 doesn't count: he was in **Analysis** until July, and joined Sales in August.

Days forecast = 7 ÷ 12 = 0.583… → **0.6**. Episodes forecast = 3 ÷ 12 = **0.25 → 0.3**
(half away from zero).

## Launch scenario (history from 2026-07-29)

- Coverage: Jul 2026 is `partial` (it contains 29 Jul), and Aug, Sep and Oct are `full`. Every
  month before July is `none`.
- The full basis months are Aug and Sep 2026 only. That's 2, which is fewer than 3, so the forecast
  is `null` and `notEnoughHistory` is true, with `forecastBasisMonths` = 2.
- The chart says "Not enough history to forecast", and marks July "No absence data before
  29 Jul 2026".
