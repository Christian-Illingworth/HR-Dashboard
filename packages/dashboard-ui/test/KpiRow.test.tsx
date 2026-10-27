import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Kpis } from '@hrd/core';
import { KpiRow } from '../src/components/KpiRow';

const kpis: Kpis = {
  headcount: 14,
  onLeaveToday: 2,
  offSickToday: 2,
  attrition12m: { percent: 31.6, leavers: 5, averageHeadcount: 15.8, noStaff: false },
  bradfordAverage: { value: 3.8, noStaff: false, basisStartDate: '2025-10-29', basisIsPartial: false },
};

const tile = (name: string) => within(screen.getByRole('group', { name }));

describe('KpiRow', () => {
  it('shows the five headline numbers with their labels', () => {
    render(<KpiRow kpis={kpis} />);
    expect(tile('Headcount').getByText('14')).toBeInTheDocument();
    expect(tile('On leave today').getByText('2')).toBeInTheDocument();
    expect(tile('Off sick today').getByText('2')).toBeInTheDocument();
    expect(tile('Attrition, last 12 months').getByText('31.6%')).toBeInTheDocument();
    expect(tile('Attrition, last 12 months').getByText('5 leavers, average headcount 15.8')).toBeInTheDocument();
    expect(tile('Average Bradford Factor').getByText('3.8')).toBeInTheDocument();
    expect(tile('Average Bradford Factor').getByText('Last 52 weeks')).toBeInTheDocument();
  });

  it('says "No staff in this group" instead of 0 or an error', () => {
    render(
      <KpiRow
        kpis={{
          ...kpis,
          headcount: 0,
          attrition12m: { percent: null, leavers: 0, averageHeadcount: 0, noStaff: true },
          bradfordAverage: { value: null, noStaff: true, basisStartDate: '2025-10-29', basisIsPartial: false },
        }}
      />,
    );
    expect(tile('Attrition, last 12 months').getByText('No staff in this group')).toBeInTheDocument();
    expect(tile('Average Bradford Factor').getByText('No staff in this group')).toBeInTheDocument();
  });

  it('says what period the Bradford Factor is based on when history is short', () => {
    render(<KpiRow kpis={{ ...kpis, bradfordAverage: { value: 1, noStaff: false, basisStartDate: '2026-07-29', basisIsPartial: true } }} />);
    expect(tile('Average Bradford Factor').getByText('Based on data since 29 Jul 2026')).toBeInTheDocument();
  });
});
