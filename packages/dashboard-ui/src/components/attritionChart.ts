// Chart model for the attrition section (US6, FR-014). Leavers and starters sit side by side;
// actual, known and forecast leavers stack and are drawn differently (solid, dotted, hatched),
// so they're kept apart without relying on colour. The rate is a line with dot markers.

import type { AttritionData } from '@hrd/core';
import { formatNumber } from '../format';
import type { ChartModel } from '../charts/model';

const people = (n: number) => `${formatNumber(n)} ${n === 1 ? 'person' : 'people'}`;

export function attritionModel(data: AttritionData): ChartModel {
  return {
    title: 'Leavers, starters and monthly attrition rate',
    format: people,
    integerAxis: true,
    groups: [
      {
        key: 'leavers',
        label: 'Leavers',
        parts: [
          { key: 'leaversActual', label: 'Leavers', tone: 'tone-teal', motif: 'solid' },
          { key: 'leaversKnown', label: 'Known leavers', tone: 'tone-teal', motif: 'solid' },
          { key: 'leaversForecast', label: 'Forecast further leavers', tone: 'tone-teal', motif: 'solid' },
        ],
      },
      {
        key: 'starters',
        label: 'Starters',
        parts: [
          { key: 'startersActual', label: 'Starters', tone: 'tone-cyan', motif: 'diagonal' },
          { key: 'startersKnown', label: 'Known starters', tone: 'tone-cyan', motif: 'diagonal' },
        ],
      },
    ],
    line: { key: 'ratePercent', label: 'Monthly attrition rate', tone: 'tone-navy', format: (n) => `${formatNumber(n)}%` },
    months: data.months.map((m) => ({
      month: m.month,
      period: m.period,
      isSelected: m.isSelected,
      isCurrent: m.isCurrent,
      coverage: m.coverage,
      values: {
        leaversActual: m.leaversActual,
        leaversKnown: m.leaversKnown,
        leaversForecast: m.leaversForecast,
        startersActual: m.startersActual,
        startersKnown: m.startersKnown,
        ratePercent: m.ratePercent,
      },
    })),
  };
}

export function attritionNotes(data: AttritionData): string[] {
  const hasFuture = data.months.some((m) => m.period === 'future');
  return [
    'Leavers include everyone whose employment ended, whatever the reason. Known leavers have a leaving date after today.',
    ...(hasFuture && data.notEnoughHistory ? ['Not enough history to forecast leavers yet: a forecast needs at least 3 months with staff.'] : []),
    ...(hasFuture && !data.notEnoughHistory
      ? [`Forecast: the monthly average of leavers over the last ${data.forecastBasisMonths} months, minus known leavers.`]
      : []),
    ...(data.months.some((m) => m.noStaff) ? ['No staff in this group in some months, so there is no rate for them.'] : []),
  ];
}
