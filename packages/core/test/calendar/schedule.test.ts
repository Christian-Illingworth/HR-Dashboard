// T103: the sync schedule (research R7, FR-024). Worked out by hand: late October 2026 is GMT
// (UTC = UK time), July is BST (UK = UTC + 1). Tue 27 Oct is a working day; Sat 31 Oct isn't;
// Mon 28 Dec 2026 is the Boxing Day bank holiday.
import { describe, expect, it } from 'vitest';
import { shouldSync } from '../../src/calendar/schedule';

describe('shouldSync', () => {
  it.each([
    ['2026-10-27T06:00:00Z', false, false], // 06:00 UK, before sync hours
    ['2026-10-27T07:00:00Z', true, true], // 07:00
    ['2026-10-27T08:00:00Z', true, false], // 08:00: hourly yes, every 2 hours no
    ['2026-10-27T09:00:00Z', true, true],
    ['2026-10-27T19:00:00Z', true, true], // last daytime run
    ['2026-10-27T20:00:00Z', false, false],
    ['2026-10-27T02:00:00Z', true, true], // overnight run
    ['2026-10-31T02:00:00Z', true, true], // overnight runs at weekends too
    ['2026-10-31T10:00:00Z', false, false], // Saturday daytime: no
    ['2026-12-28T10:00:00Z', false, false], // bank holiday daytime: no
    ['2026-12-28T02:00:00Z', true, true], // bank holiday overnight: yes
    ['2026-07-01T06:00:00Z', true, true], // 07:00 BST
    ['2026-07-01T01:00:00Z', true, true], // 02:00 BST, overnight
    ['2026-07-01T02:00:00Z', false, false], // 03:00 BST
    ['2026-07-01T18:00:00Z', true, true], // 19:00 BST
  ])('%s → hourly %s, every 2 hours %s', (now, hourly, twoHourly) => {
    expect(shouldSync(now, 1)).toBe(hourly);
    expect(shouldSync(now, 2)).toBe(twoHourly);
  });
});
