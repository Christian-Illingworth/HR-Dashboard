// The model every chart is drawn from, so the chart, its tooltip and its table view always show
// the same values (FR-017, FR-018). Charts are hand-built SVG (research R1).

import type { Coverage, Period, Value, ValueKind } from '@hrd/core';

/** A visual motif per series, so series differ by pattern as well as colour (Principle IV). */
export type Motif = 'solid' | 'diagonal' | 'dots' | 'lines';

/** Kit tones in the kit's series order (DESIGN.md §2, "Chart series"). */
export const SERIES_TONES = ['tone-teal', 'tone-cyan', 'tone-navy', 'tone-green', 'tone-lightblue', 'tone-gray'] as const;

export interface ChartPart {
  key: string;
  label: string;
  tone: string;
  motif: Motif;
}

/** Parts of a group stack on top of each other; groups sit side by side within a month. */
export interface ChartGroup {
  key: string;
  label: string;
  parts: ChartPart[];
}

export interface ChartLine {
  key: string;
  label: string;
  tone: string;
  format: (n: number) => string;
}

export interface ChartMonth {
  month: string;
  period: Period;
  isSelected: boolean;
  isCurrent: boolean;
  coverage: Coverage;
  values: Record<string, Value>;
  /** A small figure under the month label, e.g. episodes. */
  extra?: Value;
}

export interface ChartModel {
  /** Accessible name of the chart, e.g. "Annual leave days per month". */
  title: string;
  groups: ChartGroup[];
  months: ChartMonth[];
  /** Formats a bar value, e.g. 9.5 → "9.5 days". */
  format: (n: number) => string;
  line?: ChartLine;
  /** A figure shown under each month (e.g. sickness episodes): full label, short axis label. */
  extra?: { label: string; short: string; format?: (n: number) => string };
  /** Shown in the tooltip for months with partial or no coverage (D4). */
  coverageNote?: string;
}

export const KIND_LABEL: Record<ValueKind, string> = {
  actual: 'Actual',
  toDate: 'To date',
  booked: 'Booked',
  known: 'Known',
  forecast: 'Forecast',
};

/** Draw style for a value kind: solid actuals, tinted booked/known, hatched forecasts. */
export function styleOf(kind: ValueKind): 'actual' | 'booked' | 'known' | 'forecast' {
  if (kind === 'forecast') return 'forecast';
  if (kind === 'booked') return 'booked';
  if (kind === 'known') return 'known';
  return 'actual';
}

/** A tidy axis maximum (1, 2, 2.5, 5 × 10ⁿ steps, 4 ticks). */
export function niceScale(max: number): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: 4, ticks: [0, 1, 2, 3, 4] };
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough)!;
  const top = step * Math.ceil(max / step);
  const ticks: number[] = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(Math.round(t * 1000) / 1000);
  return { top, ticks };
}

export function groupTotal(month: ChartMonth, group: ChartGroup): number | null {
  const values = group.parts.map((p) => month.values[p.key]?.value ?? null);
  if (values.every((v) => v === null)) return null;
  return values.reduce<number>((s, v) => s + (v ?? 0), 0);
}
