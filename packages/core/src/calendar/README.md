# Calendar

`bank-holidays.england-and-wales.json` is a copy of the `england-and-wales` division of the
gov.uk bank holidays feed (research R12):

- **Source**: <https://www.gov.uk/bank-holidays.json>
- **Downloaded**: 2026-10-27
- **Covers**: 2019-01-01 to 2028-12-26

Working days are Monday to Friday, excluding these dates (spec Assumptions). Refresh the file
before the coverage runs out. The sync warns, and records `bankHolidaysEndOn` in its status,
when the bundled data ends before the last day it needs.

The other files here never read the system clock. "Today" and "now" are always passed in
(constitution Principle VI).
