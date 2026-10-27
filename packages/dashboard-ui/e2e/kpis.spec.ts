// US1 end to end on mock data. Expected values: fixtures/expected/kpis.md (worked out by hand).
import { expect, test } from '@playwright/test';
import { expectNoAxeViolations, openHarness } from './helpers';

test('the KPI row matches the hand-worked values for 27 Oct 2026', async ({ page }) => {
  await openHarness(page);
  const kpi = (name: string) => page.getByRole('group', { name });
  await expect(kpi('Headcount')).toContainText('14');
  await expect(kpi('On leave today')).toContainText('2');
  await expect(kpi('Off sick today')).toContainText('2');
  await expect(kpi('Attrition, last 12 months')).toContainText('31.6%');
  await expect(kpi('Attrition, last 12 months')).toContainText('5 leavers, average headcount 15.8');
  await expect(kpi('Average Bradford Factor')).toContainText('3.8');
  await expect(page.getByText('Last updated 27 Oct 2026, 09:00')).toBeVisible();
  await expectNoAxeViolations(page);
});
