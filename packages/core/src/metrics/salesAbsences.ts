// Metric: docs/metric-catalogue.md#m15

import type { CategorisedAbsence, DashboardContext } from '../dashboard/context';
import { ALL, type SalesData, type SalesEntry } from '../dashboard/types';
import { addDays } from '../dates';
import { isSalesDepartment } from '../sync/buildRecords';
import { inGroup } from './membership';

/**
 * M15 and FR-019/FR-020. Sales employees absent today ("Today") or on any day from tomorrow to
 * today + 14 ("Upcoming"), always relative to today whatever month is picked (FR-022).
 * Sickness reasons appear only here (FR-006).
 */
export function salesAbsences(ctx: DashboardContext): SalesData {
  const { today, settings, filter } = ctx;
  const tomorrow = addDays(today, 1);
  const horizon = addDays(today, 14);

  const current = ctx.records.employees.filter((e) => e.endDate === null || e.endDate >= today);
  const lower = (s: string) => s.trim().toLowerCase();
  const departmentsNotFound = settings.salesDepartments.filter(
    (name) => !current.some((e) => lower(e.department) === lower(name)),
  );
  const outsideFilter = filter.department !== ALL && !isSalesDepartment(filter.department, settings);
  const base = { outsideFilter, departmentsNotFound, pendingAvailable: false };
  if (outsideFilter) return { ...base, today: [], upcoming: [] };

  const people = new Map(
    current
      .filter((e) => isSalesDepartment(e.department, settings) && inGroup(ctx.membership.at(e.employeeId, today), filter))
      .map((e) => [e.employeeId, e]),
  );
  const reasons = new Map(ctx.records.reasons.map((r) => [r.absenceId, r.reason]));

  const entry = (a: CategorisedAbsence): SalesEntry => {
    const e = people.get(a.employeeId)!;
    const returnDate =
      a.endDate === null ? null : a.endPart === 'FirstHalf' ? a.endDate : ctx.calendar.nextWorkingDay(a.endDate);
    return {
      name: [e.givenName, e.familyName].filter(Boolean).join(' ') || 'Name not available',
      role: e.jobTitle,
      absenceType: a.displayName,
      sicknessReason: a.category === 'sickness' ? (reasons.get(a.absenceId) ?? null) : null,
      start: { date: a.startDate, part: a.startPart },
      end: a.endDate === null ? null : { date: a.endDate, part: a.endPart ?? 'FullDay' },
      returnDate,
      status: 'Approved',
    };
  };

  const theirs = ctx.absences
    .filter((a) => people.has(a.employeeId) && a.category !== 'publicHoliday')
    .sort(
      (x, y) =>
        x.startDate.localeCompare(y.startDate) ||
        (people.get(x.employeeId)!.familyName ?? '').localeCompare(people.get(y.employeeId)!.familyName ?? '') ||
        (people.get(x.employeeId)!.givenName ?? '').localeCompare(people.get(y.employeeId)!.givenName ?? ''),
    );
  const endsOnOrAfter = (a: CategorisedAbsence, date: string) => a.endDate === null || a.endDate >= date;

  return {
    ...base,
    today: theirs.filter((a) => a.startDate <= today && endsOnOrAfter(a, today)).map(entry),
    upcoming: theirs.filter((a) => a.startDate <= horizon && endsOnOrAfter(a, tomorrow)).map(entry),
  };
}
