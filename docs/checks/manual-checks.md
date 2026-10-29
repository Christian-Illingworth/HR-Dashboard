# Manual checks (quickstart Q6 and Q9)

The constitution's quality gates say a change is done only when the changed views have been
checked with a keyboard and a screen reader, and in the SharePoint mobile app (Principles III and
IV). The automated checks are `npm run test:e2e`: axe at desktop and phone width, keyboard flows
and no sideways scrolling. They don't replace these manual ones.

Fill in a row each time a view changes. Use mock data only: never check against real employee
data.

**How to run each check**

- **Keyboard only**: Tab through the whole dashboard without a mouse. Every control can be
  reached, and the focus ring is always visible.
  - The filters open with the arrow keys, Escape closes them, and focus goes back to the button.
  - Each chart is one Tab stop. The arrow keys move between months and show the tooltip, and
    "Show table" works.
  - The Today / Next 14 days switch works.
  - Refresh works.
- **Screen reader**: with NVDA or Narrator on Windows, and VoiceOver on iOS, the headings read in
  order: HR Dashboard, then each section.
  - The KPIs read as label, value and explanation.
  - Each chart month reads its exact values and kind ("Forecast", "Booked").
  - The table views read as tables with row and column headers.
  - The "Mock data" and freshness notices are announced.
- **SharePoint mobile app**: open the test page in the SharePoint app on iOS and on Android.
  - The layout fits with no sideways scrolling.
  - The filters, the chart tooltips (tap) and the Today / Next 14 days switch all work by touch.
- **Page styling**: the SharePoint page around the web part (header, navigation, fonts) is
  unchanged, and the dashboard keeps the kit's look (Poppins, navy text, white cards).
- **Length of service** (feature 002):
  - Keyboard: Tab reaches the work anniversaries list, and the arrow keys scroll it.
  - Screen reader: each band reads as its name and count ("2–3 yrs: 2 people"), and each
    milestone anniversary reads "Milestone".
  - SharePoint app: the anniversary list scrolls by touch inside the card, without scrolling the
    page sideways; on a phone each entry shows the badges and date, then the name and role.

| Date | Tester | Build (commit) | Keyboard only | NVDA / Narrator | VoiceOver (iOS) | SharePoint app, iOS | SharePoint app, Android | Page styling unchanged | Notes |
|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | |
