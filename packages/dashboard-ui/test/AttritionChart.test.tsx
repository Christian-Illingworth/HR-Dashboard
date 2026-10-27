import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AttritionData, Value } from '@hrd/core';
import { BarChart } from '../src/charts/BarChart';
import { ChartSection } from '../src/charts/ChartSection';
import { attritionModel, attritionNotes } from '../src/components/attritionChart';

// Values from fixtures/expected/attrition.md.
const months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];
const val = (value: number | null, kind: Value['kind']): Value => ({ value, kind });
const rows: [number | null, number | null, number | null, number | null, number | null, number | null][] = [
  [0, null, null, 0, null, 0],
  [1, null, null, 0, null, 6.9],
  [0, null, null, 0, null, 0],
  [1, 0, null, 0, 0, 7.1],
  [null, 0, 0.3, null, 1, null],
  [null, 1, 0, null, 0, null],
  [null, 0, 0.3, null, 0, null],
];
const data: AttritionData = {
  forecastBasisMonths: 12,
  notEnoughHistory: false,
  months: rows.map(([la, lk, lf, sa, sk, rate], i) => {
    const k = i < 3 ? 'actual' : i === 3 ? 'toDate' : 'actual';
    return {
      month: months[i]!,
      period: i < 3 ? 'actual' : i === 3 ? 'toDate' : 'future',
      isSelected: i === 3,
      isCurrent: i === 3,
      coverage: 'full',
      leaversActual: val(la, k),
      leaversKnown: val(lk, 'known'),
      leaversForecast: val(lf, 'forecast'),
      startersActual: val(sa, k),
      startersKnown: val(sk, 'known'),
      ratePercent: val(rate, k),
      noStaff: false,
    };
  }),
};

describe('Attrition chart', () => {
  it('describes December’s known leaver apart from the forecast', () => {
    render(<BarChart model={attritionModel(data)} />);
    const dec = screen.getAllByRole('img')[5]!;
    expect(dec).toHaveAccessibleName(
      'December 2026. Known leavers: 1 person (known). Forecast further leavers: 0 people (forecast). Known starters: 0 people (known)',
    );
  });

  it('shows the current month’s rate in the tooltip', () => {
    render(<BarChart model={attritionModel(data)} />);
    fireEvent.focus(screen.getAllByRole('img')[3]!);
    expect(screen.getByText('Monthly attrition rate: 7.1% (to date)')).toBeInTheDocument();
  });

  it('labels the future months "Known and forecast" in words', () => {
    render(<BarChart model={attritionModel(data)} />);
    expect(screen.getByText('Known and forecast')).toBeInTheDocument();
  });

  it('has a legend for leavers, starters, the rate line and each kind', () => {
    render(
      <ChartSection id="a" title="Staff attrition" section={{ status: 'ok', data }} emptyText="" toModel={attritionModel} notes={attritionNotes} />,
    );
    const key = screen.getByRole('list', { name: 'Key' });
    for (const label of ['Leavers', 'Starters', 'Monthly attrition rate', 'Known', 'Forecast (hatched, dashed edge)']) {
      expect(key).toHaveTextContent(label);
    }
    expect(screen.getByText(/minus known leavers/)).toBeInTheDocument();
  });
});
