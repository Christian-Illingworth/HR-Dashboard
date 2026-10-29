# @hrd/sync-function

The HR Dashboard back end on Azure Functions v4 (Node 22). It syncs BrightHR into the data site
and serves the dashboard API. See [plan.md](../../specs/001-hr-dashboard/plan.md) and
[research.md](../../specs/001-hr-dashboard/research.md) R3–R8.

| Function | Trigger | Code |
|---|---|---|
| `syncSchedule` | Timer, hourly (UTC) | Queues a sync in sync hours: 07–19 UK time on working days, plus 02:00 (`shouldSync` in core). |
| `syncRun` | Queue `sync-requests` | `src/sync/runSync.ts`: lock, fetch, build, reconcile, retention, write, status. |
| `dashboard` | `GET /api/dashboard` | `src/http/dashboard.ts`: Entra token and `Dashboard.Read` role check, then the figures. |
| `refresh` | `POST /api/refresh` | `src/http/refresh.ts`: one refresh every 15 minutes across all users. |

## Local development (mock data only)

```text
npm run sync:mock                      # one mock sync into .local-data/ (the "just launched" case)
npm run sync:mock -- --seed-history    # seed a year of synthetic history first, then sync
npm test                               # includes this workspace's unit and HTTP tests
npm run build -w @hrd/sync-function    # bundle to dist/ and copy the synthetic fixtures
```

- `MOCK_NOW=2026-10-27T10:00:00Z` fixes the clock for `sync:mock`.
- The HTTP handlers are tested directly with test-signed tokens (`test/http`). There is no
  setting or header that skips authorization.
- `func start` also needs Azure Functions Core Tools v4 and Azurite for the queue. Copy
  `local.settings.example.json` to `local.settings.json`, which is gitignored and holds no
  secrets in mock mode. Neither tool was installed on the machine this was built on, so
  `func start` hasn't been run there.

## Settings

All settings are listed in `src/config.ts`, with the deployed values in
[docs/runbooks/deploy-function.md](../../docs/runbooks/deploy-function.md). `BRIGHTHR_MODE`
defaults to `mock`. `live` is set by a human at go-live, and until Milestone 3 it refuses to start.
