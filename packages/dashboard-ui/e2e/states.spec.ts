// US4 and FR-026: every simulated state shows the right message, keeps good data on screen,
// and passes axe. States come from the harness's ?state= parameter.
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations } from './helpers';

const open = async (page: import('@playwright/test').Page, state: string) => {
  await page.goto(`/?today=2026-10-27&state=${state}`);
};

test('loading: every section shows a loading state, not blanks or zeros', async ({ page }) => {
  await open(page, 'loading');
  await expect(page.getByText('Loading', { exact: true })).toHaveCount(6);
  await expectNoAxeViolations(page);
});

test('no data yet: a clear message and empty sections, not zeros', async ({ page }) => {
  await open(page, 'noData');
  await expect(page.getByText('No data yet.')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Headcount' })).toHaveCount(0);
  await expectNoAxeViolations(page);
});

for (const [state, text] of [
  ['staleFailed', 'The latest update from BrightHR failed.'],
  ['staleThreshold', 'This data may be out of date.'],
  ['staleOvernight', "Last night's update didn't complete."],
] as const) {
  test(`${state}: says so and keeps showing the last good data`, async ({ page }) => {
    await open(page, state);
    await expect(page.getByText(text)).toBeVisible();
    await expect(page.getByRole('group', { name: 'Headcount' })).toContainText('14');
    await expectNoAxeViolations(page);
  });
}

test('one section failing does not blank the others (FR-026)', async ({ page }) => {
  await open(page, 'sectionError');
  await expect(page.getByRole('region', { name: 'Sickness' }).getByRole('alert')).toContainText('could not be calculated');
  await expect(page.getByRole('group', { name: 'Headcount' })).toContainText('14');
  await expect(page.getByRole('table', { name: 'Sales absences today' })).toBeVisible();
  await expectNoAxeViolations(page);
});

test('unavailable: an error with a retry, and an error state in each section', async ({ page }) => {
  await open(page, 'unavailable');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText('This section could not be loaded.')).toHaveCount(6);
  await expectNoAxeViolations(page);
});

test('no access (FR-005): who to contact, no sections, and axe-clean', async ({ page }) => {
  await open(page, 'forbidden');
  await expect(page.getByRole('heading', { name: "You don't have access to the HR Dashboard" })).toBeVisible();
  await expect(page.getByText('To ask for access, contact the HR team.')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Headcount' })).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test('refresh: a second refresh within 15 minutes says when the next one is available', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-27T10:30:00Z') });
  await page.goto('/?today=2026-10-27');
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText('Refreshing')).toBeVisible();
  await page.clock.runFor(15_000);
  await expect(page.getByText('Last updated 27 Oct 2026, 10:30')).toBeVisible();
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText('The next one is available at 10:45.')).toBeVisible();
});
