// US5 end to end on mock data. Expected values: fixtures/expected/leave.md, sickness.md,
// absence.md and forecast-sickness.md (worked out by hand).
import { expect, test, type Page } from '@playwright/test';
import { expectNoAxeViolations, expectNoHorizontalScroll, openHarness } from './helpers';

const section = (page: Page, name: string) => page.getByRole('region', { name });

async function tableRows(page: Page, sectionName: string) {
  const s = section(page, sectionName);
  await s.getByRole('button', { name: 'Show table' }).click();
  const rows = s.getByRole('table').getByRole('row');
  return rows.allInnerTexts();
}

test('leave: Jul 2026 – Jan 2027, October to date, booked months labelled', async ({ page }) => {
  await openHarness(page);
  const leave = section(page, 'Annual leave');
  for (const m of ['Jul', 'Aug', 'Oct', 'Nov', 'Dec', 'Jan']) await expect(leave.getByText(m, { exact: true })).toBeVisible();
  await expect(leave.getByText('to date')).toBeVisible();
  await expect(leave.getByText('Booked', { exact: true }).first()).toBeVisible();
  const rows = await tableRows(page, 'Annual leave');
  expect(rows.slice(1).map((r) => r.replace(/\s+/g, ' ').trim())).toEqual([
    'Jul 2026 7 days',
    'Aug 2026 7 days',
    'Sept 2026 11 days',
    'Oct 2026 (to date) 9.5 days (to date)',
    'Nov 2026 7 days (booked)',
    'Dec 2026 12 days (booked)',
    'Jan 2027 5 days (booked)',
  ]);
  await expectNoAxeViolations(page);
});

test('sickness: actuals, then a labelled forecast of 3.3 days and 1.3 episodes', async ({ page }) => {
  await openHarness(page);
  await expect(section(page, 'Sickness').getByText('Forecast', { exact: true })).toBeVisible();
  const rows = await tableRows(page, 'Sickness');
  expect(rows[4]!.replace(/\s+/g, ' ')).toContain('6.5 days (to date)');
  expect(rows[5]!.replace(/\s+/g, ' ')).toContain('3.3 days (forecast)');
  expect(rows[5]!.replace(/\s+/g, ' ')).toContain('1.3 (forecast)');
});

test('absence by type: booked types and forecast sickness', async ({ page }) => {
  await openHarness(page);
  const rows = await tableRows(page, 'Absence by type');
  const nov = rows[5]!.replace(/\s+/g, ' ');
  expect(nov).toContain('3.3 days (forecast)');
  expect(nov).toContain('10 days (booked)');
  expect(rows[2]!.replace(/\s+/g, ' ')).toContain('3 days'); // compassionate in August
  await expectNoAxeViolations(page);
});

test('charts work from the keyboard: arrow keys move, the tooltip shows exact values', async ({ page }) => {
  await openHarness(page);
  const chart = section(page, 'Sickness');
  const october = chart.getByRole('img', { name: /^October 2026, to date/ });
  await october.focus();
  await expect(chart.getByText('Sickness days: 6.5 days (to date)')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(chart.getByText('Sickness days: 3.3 days (forecast)')).toBeVisible();
  await page.keyboard.press('End');
  await expect(chart.getByText('January 2027', { exact: true })).toBeVisible();
});

test('charts fit the phone layout without sideways scrolling', async ({ page }) => {
  await openHarness(page);
  await expect(section(page, 'Absence by type').getByRole('group', { name: /Absence days per month by type/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
});
