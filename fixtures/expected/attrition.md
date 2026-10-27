# Expected attrition chart values (M10–M12, M14), worked out by hand

**Today**: 2026-10-27. **Window**: Jul 2026 – Jan 2027.
Definitions: [docs/metric-catalogue.md](../../docs/metric-catalogue.md) M10–M12 and M14.

## Who joins and leaves around the window

| Person | Event | Date | Actual or known |
|---|---|---|---|
| T02 Quinn Adeyemi (Sales) | leaves | Fri 2026-08-14 | actual |
| E12 Leo Brennan (Analysis) | leaves | Tue 2026-10-27 (today) | actual (end ≤ today) |
| E15 Olivia Grant (Pricing) | starts | Mon 2026-11-16 | known starter |
| E11 Kara Whitfield (Operations) | leaves | Fri 2026-12-18 | known leaver (serving notice) |

## Monthly attrition rate (M12)

Rate = leavers in the month ÷ ((headcount on the first day + headcount on the last day) ÷ 2) × 100.
In the current month, "today" takes the place of the last day.

| Month | Headcount, first day | Headcount, last day / today | Leavers | Rate |
|---|---|---|---|---|
| Jul 2026 | 15 (E01–E14 + T02) | 15 | 0 | **0.0%** |
| Aug 2026 | 15 | 14 (T02 left on the 14th) | 1 | 1 ÷ 14.5 × 100 = 6.896… → **6.9%** |
| Sep 2026 | 14 | 14 | 0 | **0.0%** |
| Oct 2026 (to date) | 14 | 14 on 27 Oct (E12's last day, so he still counts) | 1 (E12) | 1 ÷ 14 × 100 = 7.142… → **7.1%** |
| Nov 2026 – Jan 2027 | | | | not shown (future) |

## Further-leaver forecast (M14)

The basis months are Oct 2025 – Sep 2026. All 12 had staff at the start of the month.

- Leavers per month: Dec 2025 (T03), Feb 2026 (T01), May 2026 (T04) and Aug 2026 (T02) had 1
  each; the other months had 0.
- The total is 4, so the average is 4 ÷ 12 = 0.333….
- Further leavers = max(0, average − known leavers that month):

| Month | Known leavers | Forecast further leavers |
|---|---|---|
| Nov 2026 | 0 | 0.333… → **0.3** |
| Dec 2026 | 1 (E11) | max(0, 0.333 − 1) = **0** |
| Jan 2027 | 0 | **0.3** |

The forecast is not limited by the 90-day absence history (it uses employment dates), so the
launch scenario gives the same forecast.

## The window (All)

| Month | Leavers (actual) | Leavers (known) | Leavers (forecast) | Starters (actual) | Starters (known) | Rate |
|---|---|---|---|---|---|---|
| Jul 2026 | 0 | – | – | 0 | – | 0.0% |
| Aug 2026 | 1 | – | – | 0 | – | 6.9% |
| Sep 2026 | 0 | – | – | 0 | – | 0.0% |
| Oct 2026 | 1 (to date) | 0 | – | 0 (to date) | 0 | 7.1% (to date) |
| Nov 2026 | – | 0 | 0.3 | – | 1 | – |
| Dec 2026 | – | 1 | 0 | – | 0 | – |
| Jan 2027 | – | 0 | 0.3 | – | 0 | – |

"–" means the value doesn't apply to that month and is `null` in the API.

## Department Sales (D3: department on each day)

- **Jul**: first day E01, E02, E03 + T02 = 4. Last day 4. No leavers, so 0.0%.
- **Aug**:
  - On 1 August, E04 is already Sales (his history row for August says so), so the first day is
    E01–E04 + T02 = 5. The last day is E01–E04 = 4.
  - T02 left, so 1 leaver: 1 ÷ 4.5 × 100 = **22.2%**.
- **Forecast**: the only Sales leaver in the basis is T02 (Aug 2026), so the average is
  1 ÷ 12 = 0.083… → **0.1** in each of Nov, Dec and Jan. E11 is Operations, so she isn't a Sales
  known leaver.
