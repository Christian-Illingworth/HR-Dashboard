// US6 end to end on mock data. Expected values: fixtures/expected/attrition.md (worked out by hand).
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, openHarness } from './helpers';

test('attrition: December’s known leaver apart from the forecast, and past rates', async ({ page }) => {
  await openHarness(page);
  const section = page.getByRole('region', { name: 'Staff attrition' });
  await expect(section.getByRole('img', { name: /^December 2026\. Known leavers: 1 person \(known\)\. Forecast further leavers: 0 people \(forecast\)/ })).toBeAttached();
  await expect(section.getByText('Known and forecast')).toBeVisible();

  await section.getByRole('button', { name: 'Show table' }).click();
  const rows = (await section.getByRole('table').getByRole('row').allInnerTexts()).map((r) => r.replace(/\s+/g, ' ').trim());
  expect(rows[2]).toContain('6.9%'); // August
  expect(rows[4]).toContain('7.1% (to date)'); // October
  expect(rows[5]).toContain('0.3 people (forecast)'); // November further leavers
  expect(rows[5]).toContain('1 person (known)'); // November known starter
  await expectNoAxeViolations(page);
});

test('attrition chart: keyboard tooltip shows the rate', async ({ page }) => {
  await openHarness(page);
  const section = page.getByRole('region', { name: 'Staff attrition' });
  await section.getByRole('img', { name: /^October 2026, to date/ }).focus();
  await expect(section.getByText('Monthly attrition rate: 7.1% (to date)')).toBeVisible();
});
