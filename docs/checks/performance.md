# Performance check (quickstart Q10, spec SC-002)

**Target**: dashboard data appears within **5 seconds** on a desktop on office broadband, and
within **10 seconds** on a phone on 4G.

This can only be measured on the deployed page (quickstart Q9). It needs the Function deployed
([deploy-function.md](../runbooks/deploy-function.md)) and the web part on `dataSource = api`
([access-control.md](../runbooks/access-control.md)). Use mock data (`BRIGHTHR_MODE=mock`) for
the first run, and repeat after go-live.

## How to time it

"Data appears" means the KPI row shows numbers in place of the loading placeholders.

- **Desktop**: in Edge or Chrome, open developer tools → Network, with cache disabled. Load the
  dashboard page. Note the time from the start of the page load to the finish of the
  `/api/dashboard` request, and check by eye that the KPIs are showing by then.
- **Phone**: open the page in the SharePoint app with Wi-Fi off (4G). Time it with a stopwatch
  from tapping the page to the KPIs showing. Do it three times and note the slowest.
- **Cold**: no one has used the dashboard for **20 minutes** or more, so the Function has scaled
  to zero. Check that no sync ran in those 20 minutes (syncs run on the hour in the day), or the
  instance will still be warm.
- **Warm**: load the page again straight after a cold run.

## Results

Fill in a row for each run. "Data mode" is Sample or Live.

| Date | Tester | Data mode | Device and network | Cold or warm | Time to data (s) | Target (s) | Pass? | Notes |
|---|---|---|---|---|---|---|---|---|
| | | | Desktop, office broadband | Cold | | 5 | | |
| | | | Desktop, office broadband | Warm | | 5 | | |
| | | | Phone (iOS), 4G | Cold | | 10 | | |
| | | | Phone (iOS), 4G | Warm | | 10 | | |
| | | | Phone (Android), 4G | Cold | | 10 | | |
| | | | Phone (Android), 4G | Warm | | 10 | | |

## If the cold start misses the target

1. In the Function app (Flex Consumption), set **one always-ready instance** for the HTTP
   functions (research R15). This has a small fixed monthly cost; get it agreed first.
2. Time the cold runs again.
3. Record the change in the **Complexity Tracking** table of
   [plan.md](../../specs/001-hr-dashboard/plan.md), with the measured times before and after.

If a warm run misses the target, don't set an always-ready instance. Find out where the time goes
(the Network timings for `/api/dashboard`, and Application Insights request durations) and raise it
as a defect.
