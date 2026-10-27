# Expected annual leave days per month (M06), worked out by hand

**Today**: 2026-10-27. **Window**: Jul 2026 – Jan 2027, October selected.
**Coverage**: `historyStartDate` 2025-10-01, so every month is `full`.

Working days only (D1). Public holidays are excluded: E10's "Bank holiday" on 31 Aug is
`publicHoliday` in the settings map.

| Leave | Days by month |
|---|---|
| E05, Mon 13 – Fri 17 Jul | Jul 5 |
| E01, Thu 30 Jul – Tue 4 Aug | Jul 2 (30, 31), Aug 2 (3, 4) |
| E06, Mon 24 Aug – Fri 4 Sep | Aug 5 (24–28; 31 is a bank holiday), Sep 4 (1–4) |
| E09, Mon 21 – Fri 25 Sep | Sep 5 |
| E13, Tue 29 Sep – Tue 6 Oct | Sep 2 (29, 30), Oct 4 (1, 2, 5, 6) |
| E02, Mon 26 – Fri 30 Oct | Oct 5 (28–30 are booked; the current month includes them) |
| E07, 27 Oct morning only | Oct 0.5 |
| E04, Fri 6 Nov afternoon – Tue 10 Nov morning | Nov 2 (0.5 + 1 + 0.5) |
| E01, Mon 16 – Fri 20 Nov | Nov 5 |
| E11, Mon 7 – Fri 11 Dec | Dec 5 |
| E06, Mon 21 – Thu 31 Dec | Dec 7 (21–24, 29–31; 25 and 28 are bank holidays) |
| E08, Mon 11 – Fri 15 Jan 2027 | Jan 5 |

| Month | Approved days | Kind |
|---|---|---|
| Jul 2026 | **7** | actual |
| Aug 2026 | **7** | actual |
| Sep 2026 | **11** | actual |
| Oct 2026 | **9.5** | toDate (taken to date plus booked for the rest of the month) |
| Nov 2026 | **7** | booked |
| Dec 2026 | **12** | booked |
| Jan 2027 | **5** | booked |

Pending days are `null` in every month, and `pendingAvailable` is false (BrightHR question B3).
