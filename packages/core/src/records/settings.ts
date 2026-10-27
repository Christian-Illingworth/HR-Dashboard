// HRD Settings: key/value items edited by the data administrators (data-model §2.6).

import type { AbsenceCategory, Settings } from './types';

export class SettingsInvalidError extends Error {
  readonly code = 'SETTINGS_INVALID';
  constructor(key: string, problem: string) {
    // The message names the setting and the problem only, never a value.
    super(`Setting ${key} is invalid: ${problem}`);
    this.name = 'SettingsInvalidError';
  }
}

const CATEGORIES: readonly AbsenceCategory[] = [
  'annualLeave',
  'publicHoliday',
  'sickness',
  'compassionate',
  'unpaid',
  'other',
];

export type RawSettings = Partial<Record<string, string | null>>;

function lines(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Parses the settings list. Any problem throws `SETTINGS_INVALID` (the sync then fails). */
export function parseSettings(raw: RawSettings): Settings {
  const sales = lines(raw.SalesDepartments);

  const absenceTypeMap = lines(raw.AbsenceTypeMap).map((line, i) => {
    const at = line.indexOf('=>');
    if (at < 0) throw new SettingsInvalidError('AbsenceTypeMap', `line ${i + 1} has no "=>"`);
    const displayName = line.slice(0, at).trim();
    const category = line.slice(at + 2).trim() as AbsenceCategory;
    if (!displayName) throw new SettingsInvalidError('AbsenceTypeMap', `line ${i + 1} has no display name`);
    if (!CATEGORIES.includes(category)) {
      throw new SettingsInvalidError('AbsenceTypeMap', `line ${i + 1} has an unknown category`);
    }
    return { displayName, category };
  });

  const hoursText = (raw.StandardDayHours ?? '').trim();
  const standardDayHours = hoursText === '' ? 7.5 : Number(hoursText);
  if (!Number.isFinite(standardDayHours) || standardDayHours <= 0) {
    throw new SettingsInvalidError('StandardDayHours', 'it must be a positive number of hours');
  }

  return {
    salesDepartments: raw.SalesDepartments === undefined ? ['Sales'] : sales,
    absenceTypeMap,
    pregnancyRelatedReasons: lines(raw.PregnancyRelatedReasons),
    standardDayHours,
  };
}
