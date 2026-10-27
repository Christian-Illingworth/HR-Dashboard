import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { SalesData } from '@hrd/core';
import { SalesList, SalesTabs, type SalesTab } from '../src/components/SalesList';

// Values from fixtures/expected/sales.md.
const chloe = {
  name: 'Chloe Patel', role: 'Senior Energy Analyst', absenceType: 'Sickness', sicknessReason: 'Back pain',
  start: { date: '2026-10-22', part: 'FullDay' as const }, end: null, returnDate: null, status: 'Approved' as const,
};
const ben = {
  name: 'Ben Okafor', role: 'Energy Analyst', absenceType: 'Annual leave', sicknessReason: null,
  start: { date: '2026-10-26', part: 'FullDay' as const }, end: { date: '2026-10-30', part: 'FullDay' as const }, returnDate: '2026-11-02', status: 'Approved' as const,
};
const daniel = {
  name: 'Daniel Reyes', role: 'Energy Analyst', absenceType: 'Annual leave', sicknessReason: null,
  start: { date: '2026-11-06', part: 'SecondHalf' as const }, end: { date: '2026-11-10', part: 'FirstHalf' as const }, returnDate: '2026-11-10', status: 'Approved' as const,
};
const data: SalesData = { outsideFilter: false, departmentsNotFound: [], pendingAvailable: false, today: [chloe, ben], upcoming: [chloe, ben, daniel] };

function WithTabs({ d }: { d: SalesData }) {
  const [tab, setTab] = useState<SalesTab>('today');
  return (
    <>
      <SalesTabs tab={tab} onChange={setTab} />
      <SalesList data={d} tab={tab} />
    </>
  );
}

describe('SalesList', () => {
  it('shows today’s absences with reason, open end and return date', () => {
    render(<WithTabs d={data} />);
    const table = screen.getByRole('table', { name: 'Sales absences today' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText('Chloe Patel')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('Reason: Back pain')).toBeInTheDocument();
    expect(within(rows[0]!).getAllByText('Not yet known')).toHaveLength(2);
    expect(within(rows[1]!).getByText('Mon 2 Nov')).toBeInTheDocument();
    expect(screen.getByText(/Pending requests: not available from BrightHR yet/)).toBeInTheDocument();
  });

  it('switches to the next 14 days, and marks half days in words', () => {
    render(<WithTabs d={data} />);
    const upcoming = screen.getByRole('button', { name: 'Next 14 days' });
    fireEvent.click(upcoming);
    expect(upcoming).toHaveAttribute('aria-pressed', 'true');
    const table = screen.getByRole('table', { name: 'Sales absences in the next 14 days' });
    const daniel = within(table).getByText('Daniel Reyes').closest('tr')!;
    expect(within(daniel).getByText('Fri 6 Nov (from the afternoon)')).toBeInTheDocument();
    expect(within(daniel).getByText('Tue 10 Nov (until midday)')).toBeInTheDocument();
    expect(within(daniel).getByText('Tue 10 Nov')).toBeInTheDocument();
  });

  it('says nobody is off instead of showing an empty table', () => {
    render(<SalesList data={{ ...data, today: [] }} tab="today" />);
    expect(screen.getByText('Nobody in Sales is off today.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('explains when Sales is outside the department filter', () => {
    render(<SalesList data={{ ...data, outsideFilter: true, today: [], upcoming: [] }} tab="today" />);
    expect(screen.getByText('Sales is outside the current department filter.')).toBeInTheDocument();
  });

  it('names Sales department settings that match nobody', () => {
    render(<SalesList data={{ ...data, departmentsNotFound: ['Sales Ops'] }} tab="today" />);
    expect(screen.getByText(/Nobody is in the Sales department “Sales Ops”/)).toBeInTheDocument();
  });
});
