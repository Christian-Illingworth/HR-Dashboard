# Expected absence days by type per month (M09), worked out by hand

**Today**: 2026-10-27. Annual leave and public holidays are left out. Categories come from D5
with the fixture `AbsenceTypeMap`:
- "Compassionate leave" → compassionate.
- "Unpaid leave" → unpaid.
- Everything else that isn't sickness → other. That includes TOIL, "Medical appointment",
  "Paternity leave", and the unknown `$type` "Study".

| Absence | Category | Days by month |
|---|---|---|
| E02 TOIL, Fri 24 Jul | other | Jul 1 |
| E05 Compassionate leave, Mon 17 – Wed 19 Aug | compassionate | Aug 3 |
| E10 Medical appointment, 10 Sep 09:00–12:00 (same-day Time) | other | Sep 0.5 |
| E07 Study leave (unknown `$type` "Study"), Wed 14 Oct | other | Oct 1 |
| E14 Paternity leave, Mon 2 – Fri 13 Nov | other | Nov 10 |
| E13 Unpaid leave, Mon 14 – Tue 15 Dec | unpaid | Dec 2 |

Sickness is as in sickness.md. Future months use the forecast.

| Month | Sickness | Compassionate | Unpaid | Other | Kinds |
|---|---|---|---|---|---|
| Jul 2026 | 5 | 0 | 0 | 1 | all actual |
| Aug 2026 | 2 | 3 | 0 | 0 | all actual |
| Sep 2026 | 5 | 0 | 0 | 0.5 | all actual |
| Oct 2026 | 6.5 | 0 | 0 | 1 | all toDate |
| Nov 2026 | 3.3 | 0 | 0 | 10 | sickness forecast, others booked |
| Dec 2026 | 3.3 | 0 | 2 | 0 | sickness forecast, others booked |
| Jan 2027 | 3.3 | 0 | 0 | 0 | sickness forecast, others booked |
