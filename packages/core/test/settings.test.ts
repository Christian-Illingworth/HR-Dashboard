// HRD Settings parsing (data-model §2.6).
import { describe, expect, it } from 'vitest';
import { parseSettings, SettingsInvalidError } from '../src/records/settings';
import rawSettings from '../../../fixtures/settings.json';

describe('settings parser', () => {
  it('parses the fixture settings', () => {
    expect(parseSettings(rawSettings)).toEqual({
      salesDepartments: ['Sales'],
      absenceTypeMap: [
        { displayName: 'Bank holiday', category: 'publicHoliday' },
        { displayName: 'Compassionate leave', category: 'compassionate' },
        { displayName: 'Unpaid leave', category: 'unpaid' },
      ],
      pregnancyRelatedReasons: ['Pregnancy-related illness'],
      standardDayHours: 7.5,
    });
  });

  it('splits lines, trims them and drops blanks (including Windows line endings)', () => {
    const s = parseSettings({ SalesDepartments: '  Sales \r\n\r\nSales Ops ', AbsenceTypeMap: ' Bank holiday=>publicHoliday \n' });
    expect(s.salesDepartments).toEqual(['Sales', 'Sales Ops']);
    expect(s.absenceTypeMap).toEqual([{ displayName: 'Bank holiday', category: 'publicHoliday' }]);
  });

  it('uses the defaults for missing keys', () => {
    expect(parseSettings({})).toEqual({
      salesDepartments: ['Sales'],
      absenceTypeMap: [],
      pregnancyRelatedReasons: [],
      standardDayHours: 7.5,
    });
  });

  it.each([
    [{ AbsenceTypeMap: 'Gardening leave => holiday' }, 'unknown category'],
    [{ AbsenceTypeMap: 'Gardening leave' }, 'missing =>'],
    [{ AbsenceTypeMap: ' => other' }, 'missing display name'],
    [{ StandardDayHours: '0' }, 'zero hours'],
    [{ StandardDayHours: '-1' }, 'negative hours'],
    [{ StandardDayHours: 'seven' }, 'not a number'],
  ] as [Record<string, string>, string][])('rejects %j (%s) with SETTINGS_INVALID', (raw) => {
    expect(() => parseSettings(raw)).toThrow(SettingsInvalidError);
    try {
      parseSettings(raw);
    } catch (e) {
      expect((e as SettingsInvalidError).code).toBe('SETTINGS_INVALID');
    }
  });
});
