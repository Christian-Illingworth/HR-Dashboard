// US3 end to end on mock data. Expected values: fixtures/expected/sales.md (worked out by hand).
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, expectNoHorizontalScroll, openHarness } from './helpers';

test('Who’s off in Sales: today, then the next 14 days', async ({ page }) => {
  await openHarness(page);
  const section = page.getByRole('region', { name: "Who's off in Sales" });

  const today = section.getByRole('table', { name: 'Sales absences today' });
  await expect(today.getByRole('row')).toHaveCount(3); // header + 2
  await expect(today).toContainText('Chloe Patel');
  await expect(today).toContainText('Reason: Back pain');
  await expect(today).toContainText('Ben Okafor');
  await expect(today).not.toContainText('Daniel Reyes');

  await section.getByRole('button', { name: 'Next 14 days' }).click();
  const upcoming = section.getByRole('table', { name: 'Sales absences in the next 14 days' });
  await expect(upcoming.getByRole('row')).toHaveCount(4); // header + 3
  await expect(upcoming).toContainText('Daniel Reyes');
  await expect(upcoming).toContainText('Fri 6 Nov (from the afternoon)');
  await expect(upcoming).not.toContainText('Amelia Hart'); // leave starts 20 days from today

  await expect(section).toContainText('Pending requests: not available from BrightHR yet');
  await expectNoAxeViolations(page);
  await expectNoHorizontalScroll(page);
});

test('the Today/Next 14 days switch works from the keyboard', async ({ page }) => {
  await openHarness(page);
  const section = page.getByRole('region', { name: "Who's off in Sales" });
  const upcoming = section.getByRole('button', { name: 'Next 14 days' });
  await upcoming.focus();
  await page.keyboard.press('Enter');
  await expect(upcoming).toHaveAttribute('aria-pressed', 'true');
  await expect(section.getByRole('table', { name: 'Sales absences in the next 14 days' })).toBeVisible();
});
