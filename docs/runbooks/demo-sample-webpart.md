# Runbook: demo the mock-data web part in SharePoint (Milestone 1)

**For**: the person demoing the dashboard, with a SharePoint admin for steps 3 and 4.
**Needs**: no BrightHR access, no Azure and no Entra app registration. The web part runs on
built-in synthetic data and labels every view "Mock data".

Claude does not deploy or upload anything (CLAUDE.md, Hard constraints). A person does each
step below.

## Before you start

- **Node.js 22.14 or later, but not 23.** SPFx 1.23.2 requires it (`.nvmrc` says 22). The rest of
  the repo also runs on Node 24, but the web part build doesn't.
- **The SPFx web part must be scaffolded** (tasks T008, T039 and T040). Until it is,
  `npm run build:webpart` builds and checks the UI library only, then stops with a message. To
  demo before then, run the harness instead: `npm run dev:harness`, then open
  <http://localhost:5173/?today=2026-10-27>.

## Steps

1. **Build and check the package.** From the repo root:
   ```text
   npm ci
   npm test
   npm run build:webpart
   ```
   `build:webpart` ends with "Bundle check passed" and prints the package path,
   `apps/webpart/sharepoint/solution/*.sppkg`. If the bundle check fails, stop: do not upload.
2. **Check the package contents.** Open the `.sppkg` (it's a zip) and confirm it contains only
   the web part's files: no `.env`, no `local.settings.json`, nothing from `fixtures/` outside the
   JavaScript.
3. **Upload to the app catalog (SharePoint admin).** Upload the `.sppkg` to the tenant app
   catalog, or to a site collection app catalog for a test site. Don't make it available to all
   sites. There's no API permission request to approve in Milestone 1.
4. **Add it to a test page.**
   - Create a page on a test site that only the demo audience can open, and add the
     **HR Dashboard** web part.
   - In the web part's property pane, leave **Data source** as **Mock data** (`sample`) and
     **Sample date** as 2026-10-27.
   - Set **No-access contact** to who people should contact, for example "Contact the HR team".
5. **Check what you see** before showing anyone:
   - [ ] The amber "**Mock data.** These are sample figures about made-up people…" notice at the top.
   - [ ] "Last updated 27 Oct 2026, 09:00".
   - [ ] KPIs: headcount 14, on leave 2, off sick 2, attrition 31.6%, Bradford 3.8.
   - [ ] Charts Jul 2026 – Jan 2027, with October highlighted, and Forecast and Booked labelled
         under the axis.
   - [ ] "Who's off in Sales" shows Chloe Patel and Ben Okafor today.
   - [ ] The SharePoint page's own header and navigation look unchanged around the web part.
6. **Record the manual checks** (keyboard, screen readers, the SharePoint mobile app) in
   [docs/checks/manual-checks.md](../checks/manual-checks.md).

## Removing it

Delete the page or the web part, then remove the app from the app catalog. Nothing else was
created: mock-data mode stores nothing and calls nothing.
