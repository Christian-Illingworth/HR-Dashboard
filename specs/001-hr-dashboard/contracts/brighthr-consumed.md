# Contract: BrightHR Customer API, as consumed

The subset of BrightHR Customer API v1 that the sync uses. It comes from the public docs
(<https://docs.bright.hr/api/customer-api-v1>, OpenAPI bundle v1.0.373554). Nobody has
called the API. This contract is what `MockBrightHrClient` must reproduce (Principle VII). The
contract tests in `apps/sync-function/test/contract/` check it against the live API, but only
when a human runs them with live access approved.

## Allowed calls

The BrightHR client refuses anything not in this table. A unit test proves this.

| Method | URL | Body (fields we send) |
|---|---|---|
| POST | `https://login.brighthr.com/connect/token` | `grant_type=client_credentials`, `client_id`, `client_secret` (form-encoded; values from Key Vault) |
| POST | `https://api.bright.hr/employees/v1/query` | `{ "filters": { "isTerminated": boolean }, "pageSize": 100, "continuationToken"?: string }` |
| POST | `https://api.bright.hr/absences/v1/query` | `{ "filters": { "employeeId": string }, "from": date, "to": date, "pageSize": 100, "continuationToken"?: string }` |

`PUT /employees/v1/{id}/external-reference` and every other write are **never** called
(constitution: BrightHR is read-only).

## Behaviour the mock must copy

- Paging: a response is `{ items, continuationToken }`. A null or missing token means the last
  page. `pageSize` must be 1 to 100 (default 100).
- `absences/v1/query`: a missing `filters.employeeId` → 422. A `from` more than 90 days before
  today (UTC) → 422. Validation failures are `application/problem+json` with
  `type: https://docs.bright.hr/problems#field-validation` and an `errors` map. `from`/`to`
  default to today. Only approved absences are returned.
- 401 is `#token-expired`, and 403 is `#forbidden`, both as `application/problem+json`.
- The token endpoint returns `access_token` and `expires_in`. Tokens are cached until 60
  seconds before expiry.
- 401 → `BRIGHTHR_AUTH`. 429 → retry after `Retry-After` (exponential backoff with jitter if
  there's no header, at most 5 tries) and then `BRIGHTHR_RATE_LIMIT`. 5xx → retried in the
  same way, then `BRIGHTHR_UNAVAILABLE`.

## Response fields read

Only these are read; everything else is dropped by the normaliser. See data-model.md §1 for
which are stored.

Shapes are from the published OpenAPI file (v1.0.373554, read 2026-10-27). TypeScript
versions are in `packages/core/src/brighthr/types.ts`.

```text
EmployeeDto
  id
  name.givenName, name.familyName
  email
  employment.jobTitle (nullable), employment.start (nullable), employment.end (nullable)

AbsenceDto  ($type discriminator: Holiday | Sickness | Toil | Other)
  id, employeeId, $type, displayName
  start          AbsenceBoundaryDto
  end            AbsenceBoundaryDto | null
                 { $type: "LocalDate", date }
                 { $type: "LocalDateTime", date, time }
                 { $type: "LocalDatePart", date, datePart: FirstHalf | SecondHalf | FullDay }
  Sickness only:
    duration     { $type: "Days", days } | { $type: "Minutes", minutes } | null
    reason       { id, description }   (only description is used)
```

**Never read**: `note`, `reason.id`, `isCertified`, `estimatedReturn`, `isPaid`, `paidDuration`,
`externalReference`, `employment.payrollNumber`, `_metadata.*` (except as the query filter).

## Open questions

Questions B1–B12 in [research.md](../research.md#questions-for-brighthr). Each answer may change
this contract. Update it and the mock together.
