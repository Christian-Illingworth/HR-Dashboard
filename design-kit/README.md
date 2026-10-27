# Consultiv Utilities web design kit

The look of Triage, with the Consultiv Utilities logo in place of the Triage one, packaged so any web app can use it. It's plain CSS and one small script, so it works with plain HTML, ASP.NET Core (Razor or Blazor), or anything else that serves HTML.

**Read `DESIGN.md` before building a screen.** It has the rules (especially for colour) that the CSS alone can't enforce.

## What's in the folder

```
web-design-kit/
├── index.html        Live demo and reference: every component, working. Start here.
├── standalone.html   Sign-in / loading / no-access page example
├── DESIGN.md         The rules: colour, logo, type, layout, components, accessibility
├── css/
│   ├── tokens.css      Every colour, size and timing, as CSS variables. The only place values live.
│   ├── base.css        Poppins, reset, type classes, focus ring, animations, utilities
│   └── components.css  App shell, buttons, forms, tags, cards, KPIs, charts, tables, lists,
│                       split view, timeline, notices, toasts, menus, dialogs, drawers
├── js/kit.js         Sidebar collapse, tabs, menus, dialogs, toasts, donut chart (no dependencies)
├── fonts/            Poppins 400–800 (woff2, latin) + OFL licence
└── logo/             Colour and white stacked logos (150/175/250px), brandmark, favicon
```

## See it

Double-click `index.html`. If the text isn't in Poppins (some browsers block fonts opened straight from disk), serve the folder instead:

```powershell
cd web-design-kit
python -m http.server 8000
# then open http://localhost:8000
```

## Use it in a project

1. Copy `css/`, `js/`, `fonts/` and `logo/` into the project's static folder. Keep them together, because `base.css` finds the fonts at `../fonts/`.
2. Put this in `<head>` (paths relative to the page):

   ```html
   <link rel="icon" type="image/png" href="logo/favicon-32.png">
   <link rel="preload" href="fonts/poppins-700.woff2" as="font" type="font/woff2" crossorigin>
   <link rel="stylesheet" href="css/tokens.css">
   <link rel="stylesheet" href="css/base.css">
   <link rel="stylesheet" href="css/components.css">
   <script src="js/kit.js" defer></script>
   ```

3. Copy the app shell from `index.html` (`.app-shell` > `.sidebar` + `.app-main` > `.topbar` + `.content`) and build pages from the components shown there.
4. Put your own app's styles in a separate file loaded **after** the kit, using the tokens (`var(--teal)`, `var(--sp-4)`, …). Don't edit the kit files in the project. If something is missing, add it to the kit here and copy it across.

### ASP.NET Core

- Copy the four folders into `wwwroot/cu/` and use `~/cu/css/tokens.css` and so on in `Views/Shared/_Layout.cshtml`. Add `asp-append-version="true"` on the stylesheets so updates aren't cached.
- **Remove Bootstrap and jQuery from the template** (the `lib/bootstrap` links in `_Layout.cshtml`). Bootstrap's `.card`, `.badge`, `.btn-primary` and `.modal` clash with this kit. Triage doesn't use Bootstrap either.
- Triage's `Views/Shared/_Head.cshtml` is a working example of the head.

### Building with Claude Code

Copy `DESIGN.md` into the new project's root, and add this line to its `CLAUDE.md`:

> Follow DESIGN.md for all UI. Use the classes in wwwroot/cu/css/components.css and the tokens in tokens.css; never hard-code a colour.

That keeps new screens on-brand without reminding it each time.

## Scripting

`kit.js` wires itself up from data attributes (`data-tab`, `data-menu`, `data-open`, `data-close`). The same functions are on `window.CU`:

```js
CU.toast('Ticket #48213 resolved', { action: { label: 'Undo', onClick: undo } });
CU.toast("We couldn't save that change.", { error: true });
CU.openDialog('confirmResolve');   CU.closeDialog('confirmResolve');
CU.showTab('inbox');
CU.donut(document.getElementById('byStatus'), [
  { label: 'Open', value: 58, tone: 'cyan' },
  { label: 'Waiting on supplier', value: 41, tone: 'teal' },
  { label: 'Resolved', value: 112, tone: 'green' }
], { label: 'Active', sub: 'tickets' });
```

## Where it came from

The kit was taken from Triage (`github.com/ConsultivUtilities/Triage`, `Triage/wwwroot/dashboard.css`) on 27 October 2026. The values and component styles are Triage's. Triage-only parts (ticket fields, supplier cards, the compose box) were made generic or left out: ticket rows became `.list-row`, the reading pane became `.split-detail`, and status colours moved from C# into `.tone-*` classes.

Triage itself doesn't use the kit's files. If Triage's look changes and you want other apps to follow, port the change here.

**The white logos were generated** from the colour PNGs (every pixel made white, transparency kept). If marketing has official white or long-version files, drop them into `logo/` under the same names.
