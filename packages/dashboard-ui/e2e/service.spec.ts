// Feature 002 end to end on mock data: length of service and work anniversaries. Expected values:
// fixtures/expected/service.md (worked out by hand). Runs at desktop and phone width.
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, expectNoHorizontalScroll, openHarness } from './helpers';

const section = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Length of service' });

test('length of service matches the hand-worked values for 27 Oct 2026', async ({ page }) => {
  await openHarness(page);
  const s = section(page);
  await expect(s.getByText('Current staff · from BrightHR start dates · All departments')).toBeVisible();
  const figures = s.getByRole('group', { name: 'Length of service figures' });
  await expect(figures).toContainText('Average5.4 yrs');
  await expect(figures).toContainText('Median4.8 yrs');
  await expect(figures).toContainText('In first year0');
  const bands = s.getByRole('list', { name: 'Staff by length of service' }).getByRole('listitem');
  await expect(bands).toHaveCount(6);
  await expect(bands.nth(1)).toHaveAccessibleName('1–2 yrs: 1 person');
  await expect(bands.nth(5)).toHaveAccessibleName('5+ yrs: 6 people');
  await expectNoAxeViolations(page);
  await expectNoHorizontalScroll(page);
});

test('work anniversaries list the next 3 months in date order, with milestones in text', async ({ page }) => {
  await openHarness(page);
  const list = section(page).getByRole('region', { name: 'Work anniversaries' });
  const rows = list.getByRole('listitem');
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(0)).toHaveText('10 yrsMilestoneGrace Lindqvist · Senior Energy AnalystFri 6 Nov');
  await expect(rows.nth(1)).toHaveText('5 yrsMilestoneChloe Patel · Senior Energy AnalystTue 1 Dec');
  await expect(rows.nth(2)).toHaveText('6 yrsNoah Achebe · Senior Energy AnalystMon 4 Jan');
  await expect(rows.nth(3)).toHaveText('3 yrsDaniel Reyes · Energy AnalystFri 8 Jan');
  await expect(list).not.toContainText('Kara Whitfield');
  // The list is a keyboard stop, so it can be scrolled without a mouse (002 FR-010).
  await list.focus();
  await expect(list).toBeFocused();
  await expectNoAxeViolations(page);
});

test('the section shows its own error state when it fails', async ({ page }) => {
  await openHarness(page, '?today=2026-10-27&state=sectionError');
  await expect(section(page).getByRole('alert')).toContainText('could not be calculated');
  await expect(page.getByRole('group', { name: 'Headcount' })).toContainText('14');
  await expectNoAxeViolations(page);
});
