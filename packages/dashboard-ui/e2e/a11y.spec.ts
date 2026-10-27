import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, expectNoHorizontalScroll, openHarness } from './helpers';

test('the default view has no WCAG 2.1 AA violations and no horizontal scroll', async ({ page }) => {
  await openHarness(page);
  await expect(page.getByText('Mock data.')).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoHorizontalScroll(page);
});

test('the dashboard renders inside a shadow root, so page styles do not reach it', async ({ page }) => {
  await openHarness(page);
  const hasShadow = await page.evaluate(() => !!document.getElementById('webpart')?.shadowRoot);
  expect(hasShadow).toBe(true);
  // The harness page sets Segoe UI on <body>; the dashboard must still use the kit's Poppins.
  const font = await page.getByRole('heading', { name: 'HR Dashboard' }).evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font).toContain('Poppins');
});
