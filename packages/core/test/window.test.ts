// D4 month window, coverage and picker (docs/metric-catalogue.md#d4). Worked out by hand.
import { describe, expect, it } from 'vitest';
import { monthWindow } from '../src/window/window';
import { coverageOf } from '../src/window/coverage';
import { pickableMonths } from '../src/window/picker';

describe('D4 window', () => {
  it('shows 3 months either side of the selected month (Oct 2026 → Jul 2026 – Jan 2027)', () => {
    const w = monthWindow('2026-10', '2026-10');
    expect(w.map((m) => m.month)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']);
    expect(w.map((m) => m.period)).toEqual(['actual', 'actual', 'actual', 'toDate', 'future', 'future', 'future']);
    expect(w.filter((m) => m.isSelected).map((m) => m.month)).toEqual(['2026-10']);
    expect(w.filter((m) => m.isCurrent).map((m) => m.month)).toEqual(['2026-10']);
  });

  it('shows only actual months for an earlier pick (May 2026 → Feb – Aug 2026)', () => {
    const w = monthWindow('2026-05', '2026-10');
    expect(w.map((m) => m.month)).toEqual(['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
    expect(w.every((m) => m.period === 'actual')).toBe(true);
    expect(w.find((m) => m.isSelected)!.month).toBe('2026-05');
    expect(w.some((m) => m.isCurrent)).toBe(false);
  });
});

describe('D4 coverage', () => {
  it('marks months against historyStartDate', () => {
    expect(coverageOf('2026-06', '2026-07-29')).toBe('none');
    expect(coverageOf('2026-07', '2026-07-29')).toBe('partial');
    expect(coverageOf('2026-08', '2026-07-29')).toBe('full');
    expect(coverageOf('2026-07', '2026-07-01')).toBe('full');
    expect(coverageOf('2026-07', null)).toBe('none');
  });
});

describe('D4 month picker', () => {
  it('offers current − 9 to current where s − 3 is on or after the history start month', () => {
    expect(pickableMonths('2026-10', '2025-10-01')).toEqual([
      '2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01',
    ]);
    expect(pickableMonths('2026-10', '2026-02-15')).toEqual(['2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05']);
  });

  it('always offers the current month', () => {
    expect(pickableMonths('2026-10', '2026-07-29')).toEqual(['2026-10']);
    expect(pickableMonths('2026-10', null)).toEqual(['2026-10']);
  });
});
