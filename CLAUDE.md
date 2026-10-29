# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The Consultiv Utilities HR Dashboard shows HR metrics from BrightHR inside SharePoint Online. The metrics include attrition, Bradford Factor, sickness and forecasts. Feature 001 has a clarified spec and a plan in [specs/001-hr-dashboard/](specs/001-hr-dashboard/), and a task list in [tasks.md](specs/001-hr-dashboard/tasks.md). Implementation has started. Delivery comes in three milestones: a mock-data web part first, then the sync function, then live data and access control. Milestone 1 is built and tested in the harness: every metric, chart, list, state and filter on mock data. Milestone 2's code is done too: the sync function (`apps/sync-function`) syncs mock BrightHR into a file or SharePoint store and serves `/api/dashboard` and `/api/refresh`, all tested locally. Milestone 3's code is done: the "no access" view, the API client's error mapping, and the live BrightHR and Graph clients behind `BRIGHTHR_MODE=live`, all tested with mocked `fetch` only. Every remaining step is for a human, in order: [deploy-function.md](docs/runbooks/deploy-function.md), [access-control.md](docs/runbooks/access-control.md), then [go-live.md](docs/runbooks/go-live.md). [docs/checks/release-gate.md](docs/checks/release-gate.md) lists the evidence needed before release. The SPFx shell is still missing (tasks T008, T039, T040, T095). Node 22, which it needs, is now installed through fnm (see Build & run). Pending leave waits on BrightHR (research question B3). The repository is github.com/Christian-Illingworth/HR-Dashboard.

**[.specify/memory/constitution.md](.specify/memory/constitution.md) is the governing document. Read it before any spec, plan or code work.** It wins over this file if the two ever disagree. This file only adds how Claude should work here. Do not copy the constitution's rules into this file.

## Workflow

The project uses Spec Kit 1.2.3 with PowerShell scripts. Features go through these skills in order:

1. `/speckit-specify`
2. `/speckit-clarify` (optional)
3. `/speckit-plan`
4. `/speckit-tasks`
5. `/speckit-analyze`
6. `/speckit-implement`

`/speckit-checklist`, `/speckit-converge` and `/speckit-taskstoissues` are also installed.

- Features are numbered sequentially under `specs/NNN-short-name/`. The current feature is recorded in `.specify/feature.json`, which is machine-local and gitignored.
- Every plan must pass the constitution's Constitution Check, once before Phase 0 and again after Phase 1. Anything that departs from Principles III–VIII goes in the plan's Complexity Tracking table. Principles I and II can't be waived.
- Change the constitution only through `/speckit-constitution`, and only when the user asks. The project owner must approve an amendment before anything relies on it.
- Don't edit the files under `design-kit/`, `.specify/templates/`, `.specify/scripts/` or `.claude/skills/speckit-*`. Spec Kit manages them and tracks their hashes in `.specify/integrations/*.manifest.json`.

## Stack

The constitution fixes these points:
- The front end runs in SharePoint Online, uses the Consultiv Utilities web design kit (not Fluent UI), and must work in the SharePoint mobile app.
- A back end calls BrightHR on the server and authenticates every request with the caller's Entra ID identity.
- Secrets live in Azure Key Vault.
- Synced data stays in the company's Microsoft 365 or Azure tenant.

The feature 001 plan chose the rest ([plan.md](specs/001-hr-dashboard/plan.md), with the reasons in [research.md](specs/001-hr-dashboard/research.md)):
- TypeScript throughout, on Node 22 LTS. npm workspaces: `packages/core` (pure calculations), `packages/dashboard-ui` (React on the design kit, with a Vite harness on sample data) and `apps/sync-function`. `apps/webpart` (SPFx) sits outside the workspaces.
- The SPFx web part renders inside a shadow root. Its `dataSource` property is `sample` (bundled synthetic data, calculated in the browser, labelled "Mock data") or `api` (the Function API through `AadHttpClient`). It never reads SharePoint lists, and it doesn't use PnPjs.
- Azure Functions (Flex Consumption, UK South) syncs BrightHR and serves `/api/dashboard` and `/api/refresh`. It checks the `Dashboard.Read` app role in code with `jose`.
- Synced data lives in SharePoint lists in a separate "HR Dashboard Data" site that only the Function (`Sites.Selected`) and named admins can open. Departments come from Entra ID (`User.Read.All`).
- Charts are hand-built SVG. There are no chart, UI-component or date libraries.
- Tests use Vitest, React Testing Library, and Playwright with axe.

## Build & run

Node 22 LTS is the target (`.nvmrc`). The npm workspaces also run on Node 24. The SPFx web part (`apps/webpart`, not built yet) needs Node ≥ 22.14 and < 23, as SPFx 1.23.2 requires.

This machine has Node 24.18 as the system default (`C:\Program Files\nodejs`) and Node 22.23.4 through [fnm](https://github.com/Schniz/fnm). A shell that has run `fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression` switches to Node 22 in this repo from `.nvmrc`. Without that, prefix a command with `fnm exec --using=22`, and call npm as `npm.cmd`, for example `fnm exec --using=22 npm.cmd -v`. Check `node -v` before SPFx work.

| Command (repo root) | Does |
|---|---|
| `npm ci` | Installs the workspaces (`packages/core`, `packages/dashboard-ui`, `apps/sync-function`). |
| `npm test` | Vitest for every workspace: calculations (core), components (dashboard-ui), and the sync, store, auth and HTTP handlers (sync-function). |
| `npm run typecheck` | TypeScript for all three workspaces. |
| `npm run sync:mock` | One sync with mock BrightHR and mock Entra into `.local-data/` (gitignored). Add `-- --seed-history` for a year of synthetic history. Prints counts only. |
| `npm run build -w @hrd/sync-function` | Bundles the Function app to `apps/sync-function/dist/` and copies the synthetic fixtures for mock mode. `func start` also needs Azure Functions Core Tools v4 and Azurite, which aren't installed here. |
| `npm test -w apps/sync-function -- contract` | The BrightHR contract tests. They're skipped unless `RUN_LIVE_CONTRACT=1` is set, and **only a human sets it**, at go-live (go-live runbook step 5). Never run them with live settings. |
| `npm run lint` / `npm run lint:css` | ESLint (bans Fluent UI, chart libraries, PnPjs, and clock or I/O in core) and Stylelint (no colour literals). |
| `npm run dev:harness` | The dashboard on mock data at `http://localhost:5173/?today=2026-10-27`. `&state=` simulates a state: `loading`, `noData`, `staleFailed`, `staleThreshold`, `staleOvernight`, `sectionError`, `forbidden`, `unavailable`. |
| `npm run test:e2e` | Playwright + axe against the harness (desktop and 360 px phone, Chromium and WebKit). Needs `npx playwright install chromium webkit` once. |
| `npm run build:css -w @hrd/dashboard-ui` | Regenerates the shadow-root stylesheet after a change to `design-kit/css` or `src/styles/project.css`. A test fails if you forget. |
| `npm run build:webpart` | Builds the UI library and runs the bundle check (`scripts/check-bundle.mjs`): no BrightHR hosts, Key Vault references, secrets or harness code, and mock data only in its lazy chunk. Then it builds the SPFx package. Until `apps/webpart` exists, it stops after the library with a message. |

Expected values for tests are worked out by hand in `fixtures/expected/*.md`. When a metric changes, rework the numbers there by hand first, never by running the code. The catalogue (`docs/metric-catalogue.md`) is the living definition; code links to it as `// Metric: docs/metric-catalogue.md#mNN`.

Planned commands that don't exist yet are in [quickstart.md](specs/001-hr-dashboard/quickstart.md).

| Service | Used for | Environment | Credentials | ToS / data review |
|---|---|---|---|---|
| BrightHR API | Employee, absence and sickness data (read-only) | Live access not confirmed. Mock mode only; the live client exists but only a human switches it on. | Key Vault (not set up yet) | Not done |
| Microsoft 365 / Entra ID / SharePoint Online / Microsoft Graph | Hosting, sign-in, authorization, data site, departments | Company production tenant. There is no separate dev tenant yet. | Managed identity (not set up yet) | Not applicable (already licensed) |
| Azure (Functions, Storage, Key Vault, Application Insights) | Sync and API back end, secrets | No subscription or resource group agreed yet | Managed identity (not set up yet) | Not applicable (company Azure) |

## UI

Follow [design-kit/DESIGN.md](design-kit/DESIGN.md) for all UI. Use the classes in `design-kit/css/components.css` and the tokens in `design-kit/css/tokens.css`, and never hard-code a colour. Open `design-kit/index.html` to see every component working.

- **Colour causes most mistakes.** Text is navy, and teal is the only other text colour, used for links and the active state of a control. Every other brand colour goes on marks only: dots, bars, borders and tints. Never invent a shade. Ask before adding a new hue.
- **No Fluent UI, Bootstrap or other component library.** Their classes clash with the kit's.
- **Don't edit `design-kit/`.** It is a copy of `Projects\Consultiv-Utilities-Brand\cu-web-design-kit\cu-web-design-kit`. Make kit changes at the source and copy them across. Project styles go in a separate file, loaded after the kit, that uses the kit's tokens.
- **Contain the styles.** The kit's CSS must not leak into the SharePoint page, and SharePoint's CSS must not restyle the dashboard. The plan does this with a shadow root and a build step that rewrites `:root` and `body` in the kit's CSS. `kit.js` isn't used, so its behaviours are rebuilt in React (research R2).
- **Use the kit's components.** Charts use the kit's series order and `.tone-*` classes. Forecasts still need a non-colour marker, such as a dashed line plus a "Forecast" label (constitution Principle V).

## Hard constraints

This project handles real employee records, including sickness reasons, which are special category health data.

- **Never call the live BrightHR API** or point any code, script or test at it. All development uses mock mode with synthetic data. A human switches to live data.
- **Never write to BrightHR.** The constitution allows only reads.
- **No real employee data anywhere.** Never put it in prompts, fixtures, mocks, tests, screenshots, logs or docs. Use made-up names and records only. If real data turns up in a file or output, stop and tell the user.
- **Secrets.** Never put a secret in code, config, web part properties, docs, tests or logs, and never ask for one to be pasted. Never read `.env` or local settings files that hold secrets, by any means including the shell. If a secret shows up in output, stop and tell the user to rotate it.
- **No changes to shared systems.** Never deploy to SharePoint or upload to the app catalog. Never create or change Azure resources, Entra app registrations, API permissions or admin consent, and never change Key Vault contents. Write the code and the commands, and a human runs them.
- **This file.** Keep `CLAUDE.md` current without being asked. When the project changes something it describes (status, stack, build commands, known gaps), update it in the same piece of work, in small, deliberate changes.

## Git

Every change, however small, goes through a branch:

1. Start from an up-to-date `main` with a clean working tree. If the tree has changes you didn't make, stop and ask.
2. Create a branch. For Spec Kit feature work, use the feature's `NNN-short-name`. For anything else, use a short kebab-case name that describes the change.
3. Commit on the branch once the change is verified. Use plain-English, imperative subject lines that describe the effect.
4. Merge back into `main` with `git merge --no-ff <branch>`, so each change stays visible as one unit in the history. Then delete the branch.
5. Push `main` to `origin`.

- Never force-push, rebase shared history or reset `main`. Don't create or merge PRs unless the user asks.
- Never commit secrets, `.env` or local settings files, or anything containing real employee data. Check `git diff --staged` before every commit.
- Commits are sometimes made outside a Claude session. Check `git log` and `git status` before branching or merging.
- In Windows PowerShell 5.1, a commit message containing double quotes breaks `git commit -m`. Write the message to a file and use `git commit -F <file>` instead.

## Testing standard

The constitution's Principle VI and its Development Workflow & Quality Gates section define what "tested" means. Calculation tests are written first and seen to fail. They use synthetic fixtures with expected values worked out independently, and a fixed "today". Authorization rules for sickness data also need automated tests. Don't call a change done until those gates pass. If a gate couldn't be run, say so.

## Known gaps

- **The web part is not scaffolded yet.** Node 22 is now installed (see Build & run), so T008, T039 and T040 are no longer blocked.

- **No `.claude/settings.json`.** Nothing yet denies reads of secret files. Deny rules wouldn't cover shell reads or `@`-mentions anyway. The real safeguard is keeping secrets in Key Vault and out of the project folder.
- **BrightHR API access is not confirmed.** The public docs show a 90-day absence lookback, approved absences only (no pending leave), one absence call per employee, and no department or working-pattern fields. Rate limits, a sandbox, read-only credentials, data region and terms of use are open. The questions to ask are B1–B12 in [research.md](specs/001-hr-dashboard/research.md#questions-for-brighthr).
- **The access group and Azure setup don't exist yet.** The spec limits the dashboard to one Microsoft 365 group for HR and Senior Leadership. IT creates it; Claude must not (see Hard constraints). The business decides who counts as Senior Leadership. The two data administrators (an HR data owner and one IT administrator, spec FR-028) haven't been named. The setup a human must do is P1–P10 in research.md. Assigning the group to an app role needs Entra ID P1, which hasn't been confirmed.
- **Unconfirmed spec assumptions.** The Sales department names in Entra ID haven't been checked (settings start with just "Sales"). Working days assume bank holidays in England and Wales. Headcount is assumed to be under 250.
- **Code structure section is missing.** The company guidelines ask for a Code structure section copied from `CLAUDE.md.template`. The real template hasn't been provided: the file of that name in Downloads is a copy of the guidelines. Add the section when the real template arrives.
