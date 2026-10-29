# Contract change: the `service` section of `GET /api/dashboard`

The dashboard API's single contract stays
[specs/001-hr-dashboard/contracts/dashboard-api.openapi.yaml](../../001-hr-dashboard/contracts/dashboard-api.openapi.yaml).
The Function's HTTP tests validate responses against that file. Feature 002 adds a seventh section
to it and bumps `info.version` from 0.1.0 to **0.2.0**. Nothing existing changes, so this is
backwards compatible: an older web part ignores the new section.

## Add to `DashboardResponse.sections`

```yaml
        sections:
          type: object
          required: [kpis, leave, sickness, absence, attrition, salesAbsences, service]
          properties:
            # … existing six …
            service: { $ref: '#/components/schemas/ServiceSection' }
```

## New schemas

```yaml
    ServiceSection:
      description: >
        M17 length of service and M18 work anniversaries, for current staff in the department and
        role filter. Always relative to today, whatever month is picked (spec 002 FR-012).
        Carries no start dates and no per-person service figures (002 FR-016, FR-017).
      type: object
      required: [status]
      properties:
        status: { $ref: '#/components/schemas/SectionStatus' }
        message: { type: string, description: '"No staff in this group" when status is empty.' }
        data:
          type: object
          additionalProperties: false
          required: [averageYears, medianYears, firstYear, bands, anniversaries]
          properties:
            averageYears: { type: number, description: Years to 1 dp. }
            medianYears: { type: number, description: Years to 1 dp. }
            firstYear: { type: integer, minimum: 0 }
            bands:
              type: array
              minItems: 6
              maxItems: 6
              items:
                type: object
                additionalProperties: false
                required: [band, label, count]
                properties:
                  band: { type: string, enum: [under1, y1, y2, y3, y4, y5plus] }
                  label: { type: string, description: 'For example "Under 1 yr", "1–2 yrs", "5+ yrs".' }
                  count: { type: integer, minimum: 0 }
            anniversaries:
              type: object
              additionalProperties: false
              required: [enabled, from, to, entries]
              properties:
                enabled: { type: boolean, description: False while the AnniversaryNames setting is Off; entries is then empty. }
                from: { type: string, format: date, description: Today. }
                to: { type: string, format: date, description: Today plus 3 months, clamped to the month's last day. }
                entries: { type: array, items: { $ref: '#/components/schemas/AnniversaryEntry' } }

    AnniversaryEntry:
      type: object
      additionalProperties: false
      required: [name, role, date, years, milestone]
      properties:
        name: { type: [string, 'null'], description: Given and family name; null when BrightHR has none. }
        role: { type: string }
        date: { type: string, format: date }
        years: { type: integer, minimum: 1 }
        milestone: { type: boolean, description: True when years is a multiple of 5. }
```

## Rules the tests check

- `additionalProperties: false` on the new objects, so a start date or a per-person figure can't
  be added by accident.
- 401 and 403 responses are unchanged (the `Error` schema) and contain no names from the new list
  (001 T119, extended).
- With `AnniversaryNames` `Off`: `anniversaries.enabled` is false, `entries` is empty, and the
  only names anywhere in the response are in `salesAbsences`.

## Settings change (`HRD Settings`, [001 sharepoint-lists.md](../../001-hr-dashboard/contracts/sharepoint-lists.md))

| Title (key) | Value | Default |
|---|---|---|
| `AnniversaryNames` | `On` or `Off`. Anything else means `Off`. | `Off` (provisioning script); `On` in the synthetic `fixtures/settings.json` |
