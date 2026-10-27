// Chart models for the leave, sickness and absence sections (US5). Series use the kit's tones in
// the kit's series order (DESIGN.md §2), each with its own pattern.

import type { AbsenceData, LeaveData, MonthBase, SicknessData } from '@hrd/core';
import { formatDate, formatDays, formatNumber } from '../format';
import type { ChartModel, ChartMonth } from '../charts/model';

const base = (m: MonthBase): Omit<ChartMonth, 'values'> => ({
  month: m.month,
  period: m.period,
  isSelected: m.isSelected,
  isCurrent: m.isCurrent,
  coverage: m.coverage,
});

const coverageNote = (historyStartDate: string | null) =>
  historyStartDate ? `No absence data before ${formatDate(historyStartDate)}.` : 'No absence data yet.';

/** Notes shared by the absence-based charts: say plainly when months are missing data (D4). */
export function coverageNotes(months: MonthBase[], historyStartDate: string | null): string[] {
  return months.some((m) => m.coverage !== 'full')
    ? [`${coverageNote(historyStartDate)} Months before then show only what has been synced since.`]
    : [];
}

export function leaveModel(data: LeaveData, historyStartDate: string | null): ChartModel {
  return {
    title: 'Annual leave days per month',
    format: formatDays,
    coverageNote: coverageNote(historyStartDate),
    groups: [
      { key: 'leave', label: 'Annual leave', parts: [{ key: 'approved', label: 'Approved annual leave', tone: 'tone-teal', motif: 'solid' }] },
    ],
    months: data.months.map((m) => ({ ...base(m), values: { approved: m.approvedDays } })),
  };
}

export function leaveNotes(data: LeaveData, historyStartDate: string | null): string[] {
  return [
    ...(data.pendingAvailable ? [] : ['Pending requests: not available from BrightHR yet. Only approved leave is shown.']),
    ...coverageNotes(data.months, historyStartDate),
  ];
}

export function sicknessModel(data: SicknessData, historyStartDate: string | null): ChartModel {
  return {
    title: 'Sickness days and episodes per month',
    format: formatDays,
    coverageNote: coverageNote(historyStartDate),
    extra: { label: 'Sickness episodes', short: 'Episodes', format: formatNumber },
    groups: [{ key: 'sick', label: 'Sickness', parts: [{ key: 'days', label: 'Sickness days', tone: 'tone-teal', motif: 'solid' }] }],
    months: data.months.map((m) => ({ ...base(m), values: { days: m.days }, extra: m.episodes })),
  };
}

export function sicknessNotes(data: SicknessData, historyStartDate: string | null): string[] {
  const hasFuture = data.months.some((m) => m.period === 'future');
  return [
    ...(hasFuture && data.notEnoughHistory
      ? ['Not enough history to forecast yet: a forecast needs at least 3 complete months of data.']
      : []),
    ...(hasFuture && !data.notEnoughHistory
      ? [`Forecast: the monthly average of the last ${data.forecastBasisMonths} complete months.`]
      : []),
    ...coverageNotes(data.months, historyStartDate),
  ];
}

export function absenceModel(data: AbsenceData, historyStartDate: string | null): ChartModel {
  return {
    title: 'Absence days per month by type',
    format: formatDays,
    coverageNote: coverageNote(historyStartDate),
    groups: [
      {
        key: 'absence',
        label: 'All absence',
        parts: [
          { key: 'sickness', label: 'Sickness', tone: 'tone-teal', motif: 'solid' },
          { key: 'compassionate', label: 'Compassionate', tone: 'tone-cyan', motif: 'diagonal' },
          { key: 'unpaid', label: 'Unpaid', tone: 'tone-navy', motif: 'dots' },
          { key: 'other', label: 'Other', tone: 'tone-green', motif: 'lines' },
        ],
      },
    ],
    months: data.months.map((m) => ({
      ...base(m),
      values: { sickness: m.sickness, compassionate: m.compassionate, unpaid: m.unpaid, other: m.other },
    })),
  };
}

export function absenceNotes(data: AbsenceData, historyStartDate: string | null): string[] {
  return [
    'Annual leave is not included. Future months show booked absences and forecast sickness.',
    ...coverageNotes(data.months, historyStartDate),
  ];
}
