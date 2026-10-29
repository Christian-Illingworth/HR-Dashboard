// US7 end to end on mock data. Expected values: fixtures/expected/filters.md (worked out by hand).
import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, expectNoHorizontalScroll, openHarness } from './helpers';

const kpi = (page: Page, name: string) => page.getByRole('group', { name });

async function pick(page: Page, dropdown: RegExp, option: string) {
  await page.getByRole('button', { name: dropdown }).click();
  await page.getByRole('option', { name: option }).click();
}

test('role filter: every section narrows to Senior Energy Analysts', async ({ page }) => {
  await openHarness(page);
  await pick(page, /^Role/, 'Senior Energy Analyst');
  await expect(kpi(page, 'Headcount')).toContainText('4');
  await expect(kpi(page, 'Average Bradford Factor')).toContainText('2.8');
  const sales = page.getByRole('table', { name: 'Sales absences today' });
  await expect(sales.getByRole('row')).toHaveCount(2); // header + Chloe
  await expect(sales).toContainText('Chloe Patel');
  await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
});

test('department filter: Sales is outside the filter', async ({ page }) => {
  await openHarness(page);
  await pick(page, /^Department/, 'Pricing');
  await expect(kpi(page, 'Headcount')).toContainText('2');
  await expect(page.getByText('Sales is outside the current department filter.')).toBeVisible();
});

test('month filter: May 2026 shows Feb – Aug, today’s figures unchanged', async ({ page }) => {
  await openHarness(page);
  await pick(page, /^Month/, 'May 2026');
  await expect(page.getByText(/Charts show Feb 2026 to Aug 2026/)).toBeVisible();
  const leave = page.getByRole('region', { name: 'Annual leave' });
  await expect(leave.getByRole('img', { name: /^May 2026\. Approved annual leave: 4 days \(actual\)/ })).toBeAttached();
  await expect(leave.getByText('Forecast', { exact: true })).toHaveCount(0);
  await expect(kpi(page, 'Headcount')).toContainText('14');
  await expect(page.getByRole('table', { name: 'Sales absences today' })).toContainText('Ben Okafor');
});

test('filters work with the keyboard alone, and pass axe with a list open', async ({ page }) => {
  await openHarness(page);
  const trigger = page.getByRole('button', { name: /^Role/ });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('listbox', { name: 'Role' })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Role Senior Pricing Specialist' })).toBeFocused();
  await expect(kpi(page, 'Headcount')).toContainText('2');
  await expectNoHorizontalScroll(page);
});

// Feature 002 US3. Expected values: fixtures/expected/service.md (worked out by hand).
test('length of service follows department and role, but not the month', async ({ page }) => {
  await openHarness(page);
  const service = page.getByRole('region', { name: 'Length of service' });
  const anniversaries = service.getByRole('region', { name: 'Work anniversaries' }).getByRole('listitem');

  await pick(page, /^Department/, 'Sales');
  await expect(service.getByText('Current staff · from BrightHR start dates · Sales')).toBeVisible();
  await expect(service.getByRole('group', { name: 'Length of service figures' })).toContainText('Average5.2 yrs');
  await expect(anniversaries).toHaveCount(2);
  await expect(anniversaries.nth(0)).toContainText('Chloe Patel');
  await expect(anniversaries.nth(1)).toContainText('Daniel Reyes');

  await pick(page, /^Month/, 'May 2026');
  await expect(page.getByText(/Charts show Feb 2026 to Aug 2026/)).toBeVisible();
  await expect(service.getByRole('group', { name: 'Length of service figures' })).toContainText('Average5.2 yrs');
  await expect(anniversaries).toHaveCount(2);

  await pick(page, /^Role/, 'Senior Pricing Specialist');
  await expect(service.getByText('No staff in this group')).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoHorizontalScroll(page);
});
