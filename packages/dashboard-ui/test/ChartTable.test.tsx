import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SicknessData } from '@hrd/core';
import { ChartTable } from '../src/charts/ChartTable';
import { ChartSection } from '../src/charts/ChartSection';
import { sicknessModel, sicknessNotes } from '../src/components/trendCharts';

const months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];
const sickness = (forecast: number | null): SicknessData => ({
  forecastBasisMonths: forecast === null ? 2 : 12,
  notEnoughHistory: forecast === null,
  months: months.map((month, i) => ({
    month,
    period: i < 3 ? 'actual' : i === 3 ? 'toDate' : 'future',
    isSelected: i === 3,
    isCurrent: i === 3,
    coverage: i === 0 && forecast === null ? 'partial' : 'full',
    days: { value: i > 3 ? forecast : [5, 2, 5, 6.5][i]!, kind: i > 3 ? 'forecast' : i === 3 ? 'toDate' : 'actual' },
    episodes: { value: i > 3 ? forecast : [1, 1, 2, 2][i]!, kind: i > 3 ? 'forecast' : i === 3 ? 'toDate' : 'actual' },
  })),
});

describe('ChartTable (FR-018)', () => {
  it('has the same values and kind labels as the chart', () => {
    render(<ChartTable model={sicknessModel(sickness(3.3), '2025-10-01')} />);
    const table = screen.getByRole('table', { name: 'Sickness days and episodes per month' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(8);
    expect(within(rows[4]!).getByText('Oct 2026 (to date)')).toBeInTheDocument();
    expect(within(rows[4]!).getByText('6.5 days (to date)')).toBeInTheDocument();
    expect(within(rows[5]!).getByText('3.3 days (forecast)')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('5 days')).toBeInTheDocument();
  });

  it('says "No forecast" rather than 0 when there is not enough history', () => {
    render(<ChartTable model={sicknessModel(sickness(null), '2026-07-29')} />);
    expect(screen.getAllByText('No forecast').length).toBeGreaterThan(0);
  });
});

describe('ChartSection', () => {
  it('switches between the chart and the table with a pressed-state button', () => {
    render(
      <ChartSection
        id="t"
        title="Sickness"
        section={{ status: 'ok', data: sickness(3.3) }}
        emptyText=""
        toModel={(d) => sicknessModel(d, '2025-10-01')}
        notes={(d) => sicknessNotes(d, '2025-10-01')}
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Show table' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show chart' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Forecast: the monthly average of the last 12 complete months.')).toBeInTheDocument();
  });

  it('explains missing history and the missing forecast', () => {
    render(
      <ChartSection
        id="t"
        title="Sickness"
        section={{ status: 'ok', data: sickness(null) }}
        emptyText=""
        toModel={(d) => sicknessModel(d, '2026-07-29')}
        notes={(d) => sicknessNotes(d, '2026-07-29')}
      />,
    );
    expect(screen.getByText(/Not enough history to forecast yet/)).toBeInTheDocument();
    expect(screen.getByText(/No absence data before 29 Jul 2026/)).toBeInTheDocument();
  });
});
