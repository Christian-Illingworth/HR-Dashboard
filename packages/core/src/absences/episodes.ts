// Metric: docs/metric-catalogue.md#d2

import type { IsoDate } from '../brighthr/types';
import { calendar as defaultCalendar, type WorkingDayCalendar } from '../calendar/workingDays';
import { addDays } from '../dates';
import type { AbsenceRecord } from '../records/types';

export interface SicknessEpisode {
  employeeId: string;
  startDate: IsoDate;
  /** null = still open (an open-ended absence is part of it). */
  endDate: IsoDate | null;
  absenceIds: string[];
  absences: AbsenceRecord[];
  /** True if any absence in the episode is pregnancy-related. */
  pregnancyRelated: boolean;
}

/**
 * D2. Each sickness absence is an episode, except that two sickness absences of the same
 * employee are merged when there is no working day between the end of one and the start of
 * the next (overlaps merge too). Pass sickness absences only.
 */
export function sicknessEpisodes(
  sickness: readonly AbsenceRecord[],
  cal: WorkingDayCalendar = defaultCalendar,
): SicknessEpisode[] {
  const byEmployee = new Map<string, AbsenceRecord[]>();
  for (const a of sickness) {
    const list = byEmployee.get(a.employeeId) ?? [];
    list.push(a);
    byEmployee.set(a.employeeId, list);
  }

  const episodes: SicknessEpisode[] = [];
  for (const [employeeId, list] of byEmployee) {
    const sorted = [...list].sort((x, y) => x.startDate.localeCompare(y.startDate));
    let current: SicknessEpisode | null = null;
    for (const a of sorted) {
      if (current && joins(current.endDate, a.startDate, cal)) {
        current.absences.push(a);
        current.absenceIds.push(a.absenceId);
        current.endDate =
          current.endDate === null || a.endDate === null
            ? null
            : current.endDate > a.endDate
              ? current.endDate
              : a.endDate;
        current.pregnancyRelated ||= a.pregnancyRelated;
      } else {
        current = {
          employeeId,
          startDate: a.startDate,
          endDate: a.endDate,
          absenceIds: [a.absenceId],
          absences: [a],
          pregnancyRelated: a.pregnancyRelated,
        };
        episodes.push(current);
      }
    }
  }
  return episodes;
}

function joins(previousEnd: IsoDate | null, nextStart: IsoDate, cal: WorkingDayCalendar): boolean {
  if (previousEnd === null || nextStart <= previousEnd) return true;
  return cal.workingDaysBetween(addDays(previousEnd, 1), addDays(nextStart, -1)) === 0;
}
