# Contract: SharePoint lists in the "HR Dashboard Data" site

The Function's storage schema (research R6). Logical meaning and retention for each field are
in [data-model.md §2](../data-model.md#2-stored-entities). The site is reachable only by the
Function's managed identity (`Sites.Selected` → `write` on this site) and named administrators.
The access group has **no** access.

Implementation provides a provisioning script (PnP PowerShell) that a human runs once
(research P6). The Function checks at start-up that each list and column exists, and fails the
sync with `STORE_SCHEMA` if one is missing. It never creates or changes lists itself.

`Title` is SharePoint's built-in column. "Idx" marks columns that are indexed, so filtered reads
stay under the list view threshold.

| List | Column (internal name) | Type | Idx | Notes |
|---|---|---|---|---|
| **HRD Employees** | `Title` | Text | ✓ | `employeeId`, unique (enforce unique values) |
| | `StartDate` | Date only | | |
| | `EndDate` | Date only | ✓ | Blank = still employed |
| | `JobTitle` | Text | | |
| | `Department` | Text | | |
| | `GivenName` | Text | | Blank unless in a Sales department |
| | `FamilyName` | Text | | Blank unless in a Sales department |
| | `ContentHash` | Text | | |
| **HRD Employee History** | `Title` | Text | ✓ | `employeeId|YYYY-MM`, unique |
| | `EmployeeId` | Text | ✓ | |
| | `Month` | Text | ✓ | `YYYY-MM` |
| | `Department` | Text | | |
| | `JobTitle` | Text | | |
| **HRD Absences** | `Title` | Text | ✓ | `absenceId`, unique |
| | `EmployeeId` | Text | ✓ | |
| | `BrightHrType` | Text | | |
| | `DisplayName` | Text | | |
| | `StartDate` | Date only | ✓ | |
| | `StartPart` | Choice | | FullDay, FirstHalf, SecondHalf, Time |
| | `EndDate` | Date only | ✓ | Blank = open-ended |
| | `EndPart` | Choice | | As StartPart |
| | `DurationDays` | Number | | |
| | `DurationMinutes` | Number | | |
| | `PregnancyRelated` | Yes/No | | Special category |
| | `ContentHash` | Text | | |
| **HRD Sickness Reasons** | `Title` | Text | ✓ | `absenceId`, unique |
| | `Reason` | Multiple lines (plain) | | Special category |
| **HRD Sync Status** | `Title` | Text | | Always `status` (single item) |
| | `LastAttemptStartedAt`, `LastAttemptFinishedAt`, `LastSuccessAt`, `RunningSince`, `LastManualRefreshAt` | Date and time (UTC) | | |
| | `LastAttemptOutcome` | Choice | | Running, Succeeded, Failed |
| | `LastFailureCode` | Text | | |
| | `DataMode` | Choice | | Sample, Live |
| | `HistoryStartDate` | Date only | | |
| | `Warnings` | Multiple lines (plain) | | JSON, counts only |
| **HRD Settings** | `Title` | Text | | Key: `SalesDepartments`, `AbsenceTypeMap`, `PregnancyRelatedReasons`, `StandardDayHours` |
| | `Value` | Multiple lines (plain) | | |

Turn on versioning for **HRD Settings** only, so administrators can see who changed a setting.
The other lists have versioning **off**, so old values (including reasons) don't linger in
version history.

## Concurrency

Writes to `HRD Sync Status` (the lock and the refresh limit) use the item's ETag with
`If-Match`. A 412 response means someone else won, and the caller re-reads.
