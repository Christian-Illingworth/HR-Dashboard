# Consultiv Utilities HR Dashboard Constitution

## Core Principles

### I. Security First (NON-NEGOTIABLE)

BrightHR API credentials MUST never be exposed to the browser.

- All calls to the BrightHR API MUST be made by server-side code. The SharePoint front end MUST
  talk only to the project's own back end, never to BrightHR directly.
- BrightHR credentials and all other secrets MUST live in a managed secret store (for example,
  Azure Key Vault) and be read at runtime. They MUST NOT appear in source control, client
  bundles, web part properties, build output, logs, or plain-text configuration.
- The back end MUST authenticate every request using the caller's Microsoft 365 (Entra ID)
  identity and MUST reject requests it cannot authenticate.
- The back end's access to BrightHR MUST be limited to the permissions the dashboard needs
  (read-only where BrightHR supports it).

Rationale: the BrightHR credentials unlock the whole company's HR records. Anything sent to the
browser can be read by any user with developer tools.

### II. Data Protection by Design (NON-NEGOTIABLE)

The dashboard MUST comply with UK GDPR and the Data Protection Act 2018.

- Sickness reasons are special category health data. The back end MUST return them only to
  users whose role allows it. Hiding them in the browser (CSS, conditional rendering, or
  client-side filtering) is not an acceptable control: data a user may not see MUST NOT be in
  the response at all.
- The roles allowed to see sickness reasons MUST be defined in the feature spec and enforced by
  server-side checks that have automated tests.
- Aggregated views MUST NOT let a user work out sickness details about an individual that they
  are not allowed to see, for example through a breakdown of a very small team.
- The sync MUST fetch and store only the BrightHR fields that a dashboard feature needs. Each
  synced field MUST be listed in a data inventory with its BrightHR source, its purpose, who can
  see it, and how long it is kept. Fields not in the inventory MUST NOT be synced.

Rationale: health data carries the highest legal and personal risk in this system. Once data
reaches the browser it has been disclosed, whether or not it is shown on screen. Data that is
never synced cannot leak.

### III. SharePoint-Hosted, Consultiv-Branded

- The dashboard MUST run in SharePoint Online and use the user's existing Microsoft 365
  sign-in. Users MUST NOT need a separate account.
- The UI MUST follow the Consultiv Utilities web design kit in `design-kit/`, and
  `design-kit/DESIGN.md` is its rulebook. Views MUST be built from the kit's components in
  `css/components.css` and its tokens in `css/tokens.css`, and MUST use the kit's Poppins fonts
  and logos. Colours, sizes and timings MUST come from the kit's tokens and MUST NOT be
  hard-coded. Shades or hues that are not in the kit MUST NOT be invented.
- Fluent UI, Bootstrap and other component libraries MUST NOT be used for the dashboard's UI,
  because their component classes clash with the kit's.
- The kit's styles MUST NOT leak into the surrounding SharePoint page, and SharePoint's styles
  MUST NOT change how the dashboard looks.
- Files in `design-kit/` MUST NOT be edited in this project. Anything the kit lacks is added to
  the kit at its source and copied across. Project-specific styles go in a separate file that
  uses the kit's tokens and loads after the kit.
- Every view MUST work in the SharePoint mobile app on iOS and Android, including on narrow
  screens and with touch input.

Rationale: staff already work in SharePoint, and hosting there means the dashboard inherits
Microsoft 365 sign-in and access controls. The design kit gives the dashboard the same look as
the company's other internal tools, such as Triage. Its colour rules already meet WCAG AA, which
supports Principle IV.

### IV. Accessible

- Every view MUST meet WCAG 2.1 level AA.
- Colour MUST never be the only way information is shown. Status, categories, chart series, and
  forecast versus actual MUST also be shown by text, pattern, shape, or position.
- Every chart MUST have a text or table equivalent that keyboard and screen reader users can
  reach.
- Everything interactive MUST work with a keyboard alone and show a visible focus indicator.

Rationale: everyone who needs this information must be able to get it, including people who use
assistive technology or cannot tell some colours apart. Building this in from the start costs far
less than adding it later.

### V. Honest Data

- Forecasts MUST be labelled as forecasts and styled differently from actuals (for example, a
  dashed line plus a "Forecast" label), in a way that does not rely on colour alone.
- Every view MUST show when its data was last synced from BrightHR. If the last sync failed, or
  the data is older than the expected sync interval, the view MUST say so.
- Every metric MUST have an entry in a metric catalogue kept in the repository. The entry MUST
  give the definition, the formula, the BrightHR source fields used, and how edge cases are
  handled (for example, leavers, part-time staff, or zero headcount). The code that calculates
  a metric MUST link to its catalogue entry.
- When mock data is shown, the view MUST say so (see Principle VII).

Rationale: decisions about people are made from these numbers. Users must be able to tell a
prediction from a fact, know how fresh the data is, and check how any figure was worked out.

### VI. Test-First Calculations

- Every metric calculation, including attrition %, Bradford Factor, and forecasts, MUST have
  unit tests that run against fixture data.
- Tests MUST be written, and seen to fail, before a calculation is implemented or changed.
- Tests MUST cover the edge cases in the metric's catalogue entry. Expected values MUST be worked
  out independently of the code under test (for example, by hand or in a spreadsheet).
- Calculations MUST be pure functions, separate from UI and data-fetching code, so they can be
  tested without BrightHR or SharePoint. Tests that depend on dates MUST fix "today" rather
  than read the system clock.
- Fixtures MUST use synthetic data, never real employee records.

Rationale: a wrong attrition rate or Bradford Factor can lead to unfair decisions about real
people, and calculation errors are silent. Tests are the only reliable way to catch them.

### VII. Mock-First Development

- The dashboard MUST have a mock data mode that returns data in the same shape as the BrightHR
  API: the same field names, types, and structure the back end receives.
- Mock mode SHOULD replace BrightHR at the back end's BrightHR client, so that authorization and
  calculations run the same way with mock and live data.
- Mock mode MUST be switched on and off by configuration, not code changes, and the UI MUST show
  a clear "Mock data" indicator while it is on.
- Mock data MUST be synthetic. Real employee data MUST NOT be used in mocks, fixtures, demos, or
  screenshots.
- When live BrightHR API access is confirmed, the mock shape MUST be checked against real API
  responses with contract tests, and any differences fixed in the mock.

Rationale: live BrightHR API access is not yet confirmed. Mock-first lets UI and calculation work
go ahead and be demoed now. Because the mock matches the real shape, switching to live data is a
configuration change, not a rewrite.

### VIII. Keep It Simple

- Microsoft 365 and Azure services the company already licenses MUST be considered before
  anything new is added.
- Any new service, vendor, paid library, or infrastructure component MUST be justified in the
  plan's Complexity Tracking section, naming the existing options considered and why they were
  rejected.
- Build only what a current spec needs.

Rationale: every new service adds cost, a security review, and something else to maintain. The
company already pays for and runs Microsoft 365 and Azure.

## Security & Data Handling Requirements

- BrightHR is the system of record. The dashboard reads from BrightHR and MUST NOT write to it
  unless this constitution is amended to allow it.
- All traffic MUST use HTTPS.
- Logs, telemetry, and error messages MUST NOT contain sickness reasons, and MUST NOT contain
  other personal data beyond what is needed to diagnose a fault.
- Synced data MUST be stored only in the company's Microsoft 365 or Azure tenant. Access to it
  MUST be limited to the back end's own identity and named administrators.

## Development Workflow & Quality Gates

- Features follow the Spec Kit flow: specify, plan, tasks, implement. Every plan MUST pass the
  Constitution Check against Principles I–VIII before Phase 0 research and again after Phase 1
  design.
- A change is done only when:
  - all metric unit tests pass (Principle VI);
  - an automated accessibility scan reports no violations, and changed views have been checked
    with a keyboard and a screen reader (Principle IV);
  - changed views have been checked in the SharePoint mobile app (Principle III);
  - changed views use only the design kit's components and tokens, with no hard-coded colours
    and no files in `design-kit/` edited (Principle III);
  - changed views show the last-synced time and label any forecasts (Principle V);
  - the metric catalogue and data inventory are updated for any new or changed metric or synced
    field (Principles II and V).
- Changes to authorization, secret handling, or special category data MUST get a recorded
  self-review before release, confirming that: the automated authorization tests pass, no
  secret appears in the client bundle, and a response for an unauthorised user contains no
  sickness reasons. A second reviewer SHOULD check these changes when one is available.

## Governance

This constitution takes precedence over other project practices. If a spec, plan, or task
conflicts with it, the constitution wins until it is amended.

- **Amendments**: edit this file with a written rationale, bump the version, record the change
  in a Sync Impact Report, and get the project owner's approval before relying on the change.
- **Versioning**: semantic versioning. MAJOR for removing or redefining a principle; MINOR for
  adding a principle or section, or materially expanding guidance; PATCH for clarifications and
  wording.
- **Compliance**: every plan includes a Constitution Check, and every review checks compliance.
  Any deviation from Principles III–VIII MUST be recorded in the plan's Complexity Tracking
  table with a justification. Principles I and II cannot be waived this way; they change only by
  amendment.
- **Review**: revisit this constitution when live BrightHR API access is confirmed.

**Version**: 2.0.0 | **Ratified**: 2026-10-27 | **Last Amended**: 2026-10-27
