// Metric: docs/metric-catalogue.md#d1

import type { IsoDate } from '../brighthr/types';
import { calendar as defaultCalendar, type WorkingDayCalendar } from '../calendar/workingDays';
import type { AbsenceRecord } from '../records/types';

export interface DaySpan {
  date: IsoDate;
  fraction: number;
}

export interface SpanOptions {
  /** Open-ended absences run to here. */
  today: IsoDate;
  /** Converts sickness `durationMinutes` to days. */
  standardDayHours: number;
  calendar?: WorkingDayCalendar;
}

/**
 * D1. The working days an absence covers, each with the fraction of the day it takes.
 * A boundary day counts only the half it covers: FirstHalf is the morning, SecondHalf the
 * afternoon. Sickness with a duration is scaled so the fractions add up to BrightHR's figure.
 */
export function absenceSpans(a: AbsenceRecord, opts: SpanOptions): DaySpan[] {
  const cal = opts.calendar ?? defaultCalendar;
  const openEnded = a.endDate === null;
  const end = a.endDate ?? opts.today;
  if (end < a.startDate) return [];

  const endPart = openEnded ? 'FullDay' : (a.endPart ?? 'FullDay');
  const singleDay = a.startDate === end;

  const spans = cal.workingDaysIn(a.startDate, end).map((date) => {
    if (singleDay && a.startPart === 'Time' && endPart === 'Time') return { date, fraction: 0.5 };
    const isStart = date === a.startDate;
    const isEnd = date === end;
    const morning = !(isStart && a.startPart === 'SecondHalf');
    const afternoon = !(isEnd && endPart === 'FirstHalf');
    return { date, fraction: (morning ? 0.5 : 0) + (afternoon ? 0.5 : 0) };
  });

  const recordedDays =
    a.durationDays ?? (a.durationMinutes !== null ? a.durationMinutes / (opts.standardDayHours * 60) : null);
  if (a.brightHrType !== 'Sickness' || openEnded || recordedDays === null) return spans;

  const calendarDays = spans.reduce((sum, s) => sum + s.fraction, 0);
  if (calendarDays === 0) return [];
  const scale = recordedDays / calendarDays;
  return spans.map((s) => ({ date: s.date, fraction: s.fraction * scale }));
}
