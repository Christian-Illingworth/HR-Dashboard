// Public API of @hrd/core. Every calculation here is pure: "today" and "now" are always
// passed in (constitution Principle VI).

export * from './brighthr/types';
export * from './records/types';
export * from './dashboard/types';
export { parseSettings, SettingsInvalidError, type RawSettings } from './records/settings';
export { buildRecords, isSalesDepartment, type DirectoryUser, type ReasonCandidate } from './sync/buildRecords';
export { selectSicknessReasons } from './sync/sicknessReasons';
export { buildDashboard, BadRequestError, safeSection, type BuildDashboardInput } from './dashboard/buildDashboard';
export { calendar, createCalendar, type WorkingDayCalendar } from './calendar/workingDays';
export { londonHour, londonParts, londonTimeToUtc, toLondonDate } from './calendar/london';
export { addDays, addMonths, monthOf } from './dates';
