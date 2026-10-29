# Release gate (feature 001)

From the release gate checklist in [quickstart.md](../../specs/001-hr-dashboard/quickstart.md#release-gate-checklist)
and the constitution's Development Workflow & Quality Gates section. The feature isn't done
until every item has its evidence. Tick an item only after looking at the evidence for the
build being released.

**Build (commit)**: ______  **Checked by**: ______  **Date**: ______

## Automated (run from the repository root)

- [ ] **Metrics (Q1)**: `npm test` passes, including every catalogue edge case in
      `packages/core/test/metrics/`.
- [ ] **Catalogue and inventory**: [metric-catalogue.md](../metric-catalogue.md) and
      [data-inventory.md](../data-inventory.md) match the code. Every metric file links to its
      catalogue entry (`// Metric: docs/metric-catalogue.md#mNN`), and every column the store writes
      ([sharepointStore.ts](../../apps/sync-function/src/store/sharepointStore.ts) `LIST_COLUMNS`)
      is in the inventory.
- [ ] **Authorization (Q2)**: `npm test` passes the sync-function suites `auth`, `http/dashboard`,
      `http/refresh` and `http/no-leak`, and the dashboard-ui suite `ApiDashboardClient`.
- [ ] **Read-only BrightHR (Q3)**: `npm test` passes `live-client` (the allow-list refuses
      every other call before any network request).
- [ ] **Accessibility (Q6, automated part)**: `npm run test:e2e` passes, with axe clean on every
      state at desktop and phone width.
- [ ] **No secrets in the bundle (Q8)**: `npm run build:webpart` passes its bundle check
      ([check-bundle.mjs](../../scripts/check-bundle.mjs)). Look over the `.sppkg` contents list too.
- [ ] **Styling**: `npm run lint` and `npm run lint:css` pass (no Fluent UI, chart libraries or
      PnPjs; no colour literals). `git diff --stat <last release>..HEAD -- design-kit/` is empty.
- [ ] **Types**: `npm run typecheck` passes.

## Recorded by people

- [ ] **Authorization self-review** is signed:
      [authorization-self-review.md](../reviews/authorization-self-review.md). It covers the
      authorization tests, the bundle check and a 403 response with no sickness reasons.
- [ ] **Keyboard and screen reader (Q6)**: a row for this build in
      [manual-checks.md](manual-checks.md), with keyboard only, NVDA or Narrator, and VoiceOver.
- [ ] **SharePoint mobile app (Q9)**: a row for this build in [manual-checks.md](manual-checks.md),
      for iOS and Android, with the page styling unchanged.
- [ ] **Speed (Q10)**: [performance.md](performance.md) shows every run within its target.
- [ ] **Freshness and forecasts**: every view shows "Last updated", and every forecast is labelled
      "Forecast" with a non-colour marker. Check on the deployed page.

## For live data only

- [ ] **Go-live** steps done and recorded: [go-live.md](../runbooks/go-live.md), including the
      contract tests and the data inventory's BrightHR region and terms of use.
