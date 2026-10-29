import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Section, ServiceData } from '@hrd/core';
import { ServiceSection } from '../src/components/ServiceSection';

// Values from fixtures/expected/service.md (All).
const labels = ['Under 1 yr', '1–2 yrs', '2–3 yrs', '3–4 yrs', '4–5 yrs', '5+ yrs'];
const ids = ['under1', 'y1', 'y2', 'y3', 'y4', 'y5plus'] as const;
const counts = [0, 1, 2, 2, 3, 6];
const data: ServiceData = {
  averageYears: 5.4,
  medianYears: 4.8,
  firstYear: 0,
  bands: ids.map((band, i) => ({ band, label: labels[i]!, count: counts[i]! })),
  anniversaries: { enabled: false, from: '2026-10-27', to: '2026-10-27', entries: [] },
};
const ok: Section<ServiceData> = { status: 'ok', data };

describe('ServiceSection: length of service (002 US1)', () => {
  it('shows the average, median and first-year figures', () => {
    render(<ServiceSection section={ok} department="All" />);
    const figures = screen.getByRole('group', { name: 'Length of service figures' });
    expect(within(figures).getByText('Average').nextSibling).toHaveTextContent('5.4 yrs');
    expect(within(figures).getByText('Median').nextSibling).toHaveTextContent('4.8 yrs');
    expect(within(figures).getByText('In first year').nextSibling).toHaveTextContent('0');
  });

  it('shows six bands with their counts as text, each read as band and count (002 FR-005)', () => {
    render(<ServiceSection section={ok} department="All" />);
    const list = screen.getByRole('list', { name: 'Staff by length of service' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((i) => i.getAttribute('aria-label'))).toEqual([
      'Under 1 yr: 0 people',
      '1–2 yrs: 1 person',
      '2–3 yrs: 2 people',
      '3–4 yrs: 2 people',
      '4–5 yrs: 3 people',
      '5+ yrs: 6 people',
    ]);
    expect(items[5]).toHaveTextContent('6');
  });

  it('names the department filter in the subtitle (002 US3)', () => {
    const { rerender } = render(<ServiceSection section={ok} department="All" />);
    expect(screen.getByText('Current staff · from BrightHR start dates · All departments')).toBeInTheDocument();
    rerender(<ServiceSection section={ok} department="Sales" />);
    expect(screen.getByText('Current staff · from BrightHR start dates · Sales')).toBeInTheDocument();
  });

  it('says "No staff in this group" when the group is empty (002 FR-013)', () => {
    render(<ServiceSection section={{ status: 'empty', message: 'No staff in this group' }} department="Sales" />);
    expect(screen.getByText('No staff in this group')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Staff by length of service' })).toBeNull();
  });

  it('shows an error state without blanking the page', () => {
    render(<ServiceSection section={{ status: 'error', message: 'This section could not be calculated.' }} department="All" />);
    expect(screen.getByRole('alert')).toHaveTextContent('could not be calculated');
  });
});

// Entries from fixtures/expected/service.md (All).
const entries = [
  { name: 'Grace Lindqvist', role: 'Senior Energy Analyst', date: '2026-11-06', years: 10, milestone: true },
  { name: 'Chloe Patel', role: 'Senior Energy Analyst', date: '2026-12-01', years: 5, milestone: true },
  { name: 'Noah Achebe', role: 'Senior Energy Analyst', date: '2027-01-04', years: 6, milestone: false },
  { name: null, role: 'Energy Analyst', date: '2027-01-08', years: 1, milestone: false },
];
const withList = (anniversaries: Partial<ServiceData['anniversaries']>): Section<ServiceData> => ({
  status: 'ok',
  data: { ...data, anniversaries: { enabled: true, from: '2026-10-27', to: '2027-01-27', entries, ...anniversaries } },
});

describe('ServiceSection: work anniversaries (002 US2)', () => {
  it('lists each anniversary with years, name, role and date, in a scrollable region', () => {
    render(<ServiceSection section={withList({})} department="All" />);
    expect(screen.getByRole('heading', { name: 'Work anniversaries · next 3 months' })).toBeInTheDocument();
    const region = screen.getByRole('region', { name: 'Work anniversaries' });
    expect(region).toHaveAttribute('tabindex', '0');
    const rows = within(region).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([
      '10 yrsMilestoneGrace Lindqvist · Senior Energy AnalystFri 6 Nov',
      '5 yrsMilestoneChloe Patel · Senior Energy AnalystTue 1 Dec',
      '6 yrsNoah Achebe · Senior Energy AnalystMon 4 Jan',
      '1 yrName not recorded · Energy AnalystFri 8 Jan',
    ]);
  });

  it('marks milestones in text, not by colour alone (002 FR-009)', () => {
    render(<ServiceSection section={withList({})} department="All" />);
    expect(screen.getAllByText('Milestone')).toHaveLength(2);
  });

  it('says when there are no anniversaries in the next 3 months', () => {
    render(<ServiceSection section={withList({ entries: [] })} department="Pricing" />);
    expect(screen.getByText('No work anniversaries in the next 3 months')).toBeInTheDocument();
  });

  it('says when the list is switched off, with no entries (002 FR-014)', () => {
    render(<ServiceSection section={withList({ enabled: false, entries: [] })} department="All" />);
    expect(screen.getByText("Work anniversaries aren't switched on yet.")).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Work anniversaries' })).toBeNull();
  });
});
