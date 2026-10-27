# Expected freshness (M16), worked out by hand

Definitions: [docs/metric-catalogue.md#m16](../../docs/metric-catalogue.md#m16).

- **Sync hours** are 07:00–19:59 UK time on working days (FR-024).
- **Threshold**: 2 hours, or 3 hours when `SYNC_DAYTIME_INTERVAL_HOURS` is 2.
- **Daytime age** is measured from the later of the last success and 07:00 today, so the first runs
  of the day have time to happen.
- **Reference overnight run**: the most recent 02:00 UK time run that is at least 30 minutes old.
  The data is stale if the last success is before it, inside or outside sync hours.

All the late-October and November dates below are GMT, so UTC equals UK time. 1 Jul is BST
(UTC+1).

| # | Now (UTC) | Last success (UTC) | Last attempt | Interval | Expected | Why |
|---|---|---|---|---|---|---|
| 1 | Mon 2026-11-02 07:00 | Mon 2026-11-02 02:05 | Succeeded | 1 | **fresh** | Age from 07:00 is 0. The success is after the reference run (Mon 02:00). |
| 2 | Tue 2026-10-27 02:10 | Mon 2026-10-26 19:05 | Running | 1 | **fresh** | Outside sync hours. 02:00 today is only 10 minutes old, so the reference is Mon 02:00. A running attempt doesn't count as failed. |
| 3 | Tue 2026-10-27 10:30 | Tue 2026-10-27 09:00 | **Failed** | 1 | **stale: lastAttemptFailed** | The last attempt failed. |
| 4 | Tue 2026-10-27 11:30 | Tue 2026-10-27 09:00 | Succeeded | 1 | **stale: olderThanThreshold** | Age 2 h 30 > 2 h. |
| 5 | Tue 2026-10-27 11:30 | Tue 2026-10-27 09:00 | Succeeded | 2 | **fresh** | Age 2 h 30 ≤ 3 h. |
| 6 | Sat 2026-10-31 21:00 | Fri 2026-10-30 19:05 | Succeeded | 1 | **stale: overnightMissed** | Outside sync hours. The reference is Sat 02:00, and the last success is before it. |
| 7 | Tue 2026-10-27 10:30 | none | none | 1 | **noDataYet**, not stale | No sync has succeeded. |
| 8 | Mon 2026-11-02 07:30 | Sun 2026-11-01 02:05 | Succeeded | 1 | **stale: overnightMissed** | During sync hours, but Monday's 02:00 run never succeeded. |
| 9 | Tue 2026-10-27 09:05 | Tue 2026-10-27 02:05 | Succeeded | 1 | **stale: olderThanThreshold** | Age from 07:00 is 2 h 05 > 2 h. The 07:00, 08:00 and 09:00 runs haven't succeeded. |
| 10 | Wed 2026-07-01 07:30 (08:30 BST) | Wed 2026-07-01 06:10 (07:10 BST) | Succeeded | 1 | **fresh** | Age 1 h 20. The reference is 02:00 BST = 01:00 UTC, and the last success is after it. |
| 11 | Tue 2026-10-27 10:30 (the mock data's clock) | Tue 2026-10-27 09:00 | Succeeded | 1 | **fresh** | Age 1 h 30. |

## Next refresh allowed (FR-025)

| Now | Last manual refresh | `nextAllowedAt` |
|---|---|---|
| 10:30 | 10:20 | **10:35** (10:20 + 15 minutes) |
| 10:30 | 10:00 | **10:30** (now, because 10:15 has passed) |
| 10:30 | none | **10:30** (now) |
