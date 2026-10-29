# Data inventory

This is the living data inventory (constitution Principle II, spec FR-028). Every field the sync stores is listed here with its source, purpose, who can see it and how long it is kept. A field that isn't listed must not be synced. It started as section 5 of [specs/001-hr-dashboard/data-model.md](../specs/001-hr-dashboard/data-model.md).

"Who can see it": **Function** = the Function's managed identity. **Admins** = the two named
data administrators: the HR data owner and one IT administrator (FR-028). **Access group** = HR and Senior Leadership, through the API
only.

| Data | Source | Purpose | Stored in | Who can see it | Kept for |
|---|---|---|---|---|---|
| Employee ID | `EmployeeDto.id` | Key | HRD Employees, History, Absences | Function, Admins | Until 13 months after leaving |
| Given and family name | `name.givenName`, `name.familyName` | Sales list; work anniversaries (feature 002, only while `AnniversaryNames` is `On`) | HRD Employees (Sales staff; everyone employed on the sync date while `AnniversaryNames` is `On`) | Function, Admins, Access group (Sales list and anniversary list only) | Sales staff: while in a Sales department. Everyone else: while employed and `AnniversaryNames` is `On`; cleared at the first sync after leaving or after the setting is turned `Off` |
| Email | `EmployeeDto.email` | Department matching | Not stored (sync memory only) | Function | Duration of a sync |
| Job title | `employment.jobTitle` | Role filter, Sales list | HRD Employees, History | Function, Admins, Access group | As employee / history |
| Start and end dates | `employment.start`, `employment.end` | Headcount, starters, leavers | HRD Employees | Function, Admins; Access group as totals | Until 13 months after leaving |
| Department | Entra `department` | Filters, Sales membership | HRD Employees, History | Function, Admins, Access group | As employee / history |
| Monthly department and job title | Copied from HRD Employees each month (`Month` = `YYYY-MM`) | Filters for past months (D3) | HRD Employee History | Function, Admins; Access group as totals | 13 months, or until the employee's record is removed |
| Content hash | Generated: SHA-256 of the stored fields | Skipping unchanged writes | HRD Employees, HRD Absences | Function, Admins | As the record |
| Absence ID, employee ID, type, display name | `AbsenceDto` | All absence metrics | HRD Absences | Function, Admins; Access group as totals and the Sales list | 13 months after the absence ends |
| Absence start and end dates and parts | `start`, `end`, `datePart` | Day counts, Sales list | HRD Absences | As above | As above |
| Sickness duration | `duration` | Sickness days | HRD Absences | Function, Admins; Access group as totals | As above |
| Pregnancy-related flag (**special category**) | Derived from `reason.description` | Bradford Factor exclusion | HRD Absences | Function, Admins | As above |
| Sickness reason (**special category**) | `reason.description` | Sales list (FR-006) | HRD Sickness Reasons | Function, Admins, Access group (Sales list only) | While in the Sales list's range (today to today + 14, or open-ended) |
| Sync status and warnings | Generated | Freshness, refresh limit | HRD Sync Status | Function, Admins; Access group as freshness | Overwritten each sync |
| Settings | Admin-entered | Sales departments, type mapping, whether anniversary names are stored (`AnniversaryNames`, the HR data owner's approval) | HRD Settings | Function, Admins | Until changed |

**Not synced**: `note`, `reason.id`, `isCertified`, `estimatedReturn`, `isPaid`,
`paidDuration`, `externalReference`, `payrollNumber`, reason for leaving, and clocking data.
