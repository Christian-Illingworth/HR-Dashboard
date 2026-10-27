// Everything a section builder needs, worked out once per request.

import type { IsoDate } from '../brighthr/types';
import { calendar as defaultCalendar, type WorkingDayCalendar } from '../calendar/workingDays';
import { categorise } from '../absences/category';
import { absenceSpans, type DaySpan } from '../absences/spans';
import { monthOf } from '../dates';
import { createMembership, type GroupFilter, type Membership } from '../metrics/membership';
import type {
  AbsenceCategory,
  AbsenceRecord,
  DashboardRecords,
  Month,
  Settings,
  SyncStatus,
} from '../records/types';
import { monthWindow, type WindowMonth } from '../window/window';

export interface CategorisedAbsence extends AbsenceRecord {
  category: AbsenceCategory;
  spans: DaySpan[];
}

export interface DashboardContext {
  today: IsoDate;
  now: string;
  currentMonth: Month;
  selectedMonth: Month;
  filter: GroupFilter;
  window: WindowMonth[];
  records: DashboardRecords;
  settings: Settings;
  status: SyncStatus;
  calendar: WorkingDayCalendar;
  membership: Membership;
  absences: CategorisedAbsence[];
  syncIntervalHours: 1 | 2;
}

export function createContext(args: {
  records: DashboardRecords;
  settings: Settings;
  status: SyncStatus;
  today: IsoDate;
  now: string;
  selectedMonth: Month;
  filter: GroupFilter;
  syncIntervalHours: 1 | 2;
  calendar?: WorkingDayCalendar;
}): DashboardContext {
  const cal = args.calendar ?? defaultCalendar;
  const spanOptions = { today: args.today, standardDayHours: args.settings.standardDayHours, calendar: cal };
  return {
    ...args,
    calendar: cal,
    currentMonth: monthOf(args.today),
    window: monthWindow(args.selectedMonth, monthOf(args.today)),
    membership: createMembership(args.records.employees, args.records.history, args.today),
    absences: args.records.absences.map((a) => ({
      ...a,
      category: categorise(a.brightHrType, a.displayName, args.settings.absenceTypeMap),
      spans: absenceSpans(a, spanOptions),
    })),
  };
}
