import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { LeaveData, SicknessData } from '@hrd/core';
import { BarChart } from '../src/charts/BarChart';
import { niceScale } from '../src/charts/model';
import { leaveModel, sicknessModel } from '../src/components/trendCharts';

const months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];
const period = (i: number) => (i < 3 ? 'actual' : i === 3 ? 'toDate' : 'future') as 'actual' | 'toDate' | 'future';
const kind = (i: number) => (i < 3 ? 'actual' : i === 3 ? 'toDate' : 'booked') as 'actual' | 'toDate' | 'booked';
const base = (i: number) => ({ month: months[i]!, period: period(i), isSelected: i === 3, isCurrent: i === 3, coverage: 'full' as const });

// Values from fixtures/expected/leave.md and sickness.md.
const leave: LeaveData = {
  pendingAvailable: false,
  months: [7, 7, 11, 9.5, 7, 12, 5].map((v, i) => ({ ...base(i), approvedDays: { value: v, kind: kind(i) }, pendingDays: { value: null, kind: kind(i) } })),
};
const sickness: SicknessData = {
  forecastBasisMonths: 12,
  notEnoughHistory: false,
  months: [5, 2, 5, 6.5, 3.3, 3.3, 3.3].map((v, i) => ({
    ...base(i),
    days: { value: v, kind: i > 3 ? 'forecast' : kind(i) },
    episodes: { value: [1, 1, 2, 2, 1.3, 1.3, 1.3][i]!, kind: i > 3 ? 'forecast' : kind(i) },
  })),
};

describe('BarChart', () => {
  it('has one tab stop (the selected month) and a full text label for every month', () => {
    render(<BarChart model={leaveModel(leave, '2025-10-01')} />);
    expect(screen.getByRole('group', { name: /Annual leave days per month/ })).toBeInTheDocument();
    const points = screen.getAllByRole('img');
    expect(points).toHaveLength(7);
    expect(points.filter((p) => p.getAttribute('tabindex') === '0')).toHaveLength(1);
    expect(points[3]).toHaveAttribute('tabindex', '0');
    expect(points[3]).toHaveAccessibleName('October 2026, to date. Approved annual leave: 9.5 days (to date)');
    expect(points[5]).toHaveAccessibleName('December 2026. Approved annual leave: 12 days (booked)');
  });

  it('labels non-actual months in words under the axis, not by colour alone', () => {
    render(<BarChart model={leaveModel(leave, '2025-10-01')} />);
    expect(screen.getByText('to date')).toBeInTheDocument();
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });

  it('shows the tooltip on focus and moves with the arrow keys', () => {
    render(<BarChart model={sicknessModel(sickness, '2025-10-01')} />);
    const points = screen.getAllByRole('img');
    fireEvent.focus(points[3]!);
    expect(screen.getByText('October 2026 (to date)')).toBeInTheDocument();
    expect(screen.getByText('Sickness days: 6.5 days (to date)')).toBeInTheDocument();
    fireEvent.keyDown(points[3]!, { key: 'ArrowRight' });
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByText('Sickness days: 3.3 days (forecast)')).toBeInTheDocument();
    expect(screen.getByText('Sickness episodes: 1.3 (forecast)')).toBeInTheDocument();
    fireEvent.keyDown(points[4]!, { key: 'Escape' });
    expect(screen.queryByText('November 2026')).not.toBeInTheDocument();
  });

  it('brackets forecast months with the word "Forecast" (FR-015)', () => {
    render(<BarChart model={sicknessModel(sickness, '2025-10-01')} />);
    expect(screen.getByText('Forecast')).toBeInTheDocument();
  });

  it('shows the tooltip on tap', () => {
    render(<BarChart model={leaveModel(leave, '2025-10-01')} />);
    fireEvent.click(screen.getAllByRole('img')[0]!);
    expect(screen.getByText('Approved annual leave: 7 days (actual)')).toBeInTheDocument();
  });

  it('keeps the tooltip open when a tap focuses the month first, and closes it on a second tap', () => {
    // A real tap fires pointerdown, then focus, then click (FR-017).
    render(<BarChart model={leaveModel(leave, '2025-10-01')} />);
    const july = screen.getAllByRole('img')[0]!;
    const tap = () => {
      fireEvent.pointerDown(july, { pointerType: 'touch' });
      fireEvent.focus(july);
      fireEvent.click(july);
    };
    tap();
    expect(screen.getByText('Approved annual leave: 7 days (actual)')).toBeInTheDocument();
    tap();
    expect(screen.queryByText('Approved annual leave: 7 days (actual)')).not.toBeInTheDocument();
  });
});

describe('niceScale', () => {
  it('picks a tidy top and four steps', () => {
    expect(niceScale(12)).toEqual({ top: 15, ticks: [0, 5, 10, 15] });
    expect(niceScale(6.5)).toEqual({ top: 8, ticks: [0, 2, 4, 6, 8] });
    expect(niceScale(0)).toEqual({ top: 4, ticks: [0, 1, 2, 3, 4] });
  });

  it('keeps whole-number steps with headroom for counts of people', () => {
    expect(niceScale(1, true)).toEqual({ top: 2, ticks: [0, 1, 2] });
    expect(niceScale(9, true)).toEqual({ top: 9, ticks: [0, 3, 6, 9] });
  });
});
