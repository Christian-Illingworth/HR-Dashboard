// D2 sickness episodes (docs/metric-catalogue.md#d2): "two sickness absences of the same
// employee are merged when there is no working day between the end of one and the start of
// the next".
import { describe, expect, it } from 'vitest';
import { sicknessEpisodes } from '../src/absences/episodes';
import type { AbsenceRecord } from '../src/records/types';

function sick(id: string, employeeId: string, start: string, end: string | null, pregnancyRelated = false): AbsenceRecord {
  return {
    absenceId: id,
    employeeId,
    brightHrType: 'Sickness',
    displayName: 'Sickness',
    startDate: start,
    startPart: 'FullDay',
    endDate: end,
    endPart: end ? 'FullDay' : null,
    durationDays: null,
    durationMinutes: null,
    pregnancyRelated,
  };
}

describe('D2 sickness episodes', () => {
  it('merges Friday and the following Monday', () => {
    const eps = sicknessEpisodes([sick('a', 'e1', '2026-02-06', '2026-02-06'), sick('b', 'e1', '2026-02-09', '2026-02-09')]);
    expect(eps).toHaveLength(1);
    expect(eps[0]).toMatchObject({ employeeId: 'e1', startDate: '2026-02-06', endDate: '2026-02-09', absenceIds: ['a', 'b'] });
  });

  it('does not merge Friday and Tuesday (Monday is a working day between them)', () => {
    const eps = sicknessEpisodes([sick('a', 'e1', '2026-02-06', '2026-02-06'), sick('b', 'e1', '2026-02-10', '2026-02-10')]);
    expect(eps).toHaveLength(2);
  });

  it('merges across Christmas bank holidays and a weekend', () => {
    // Thu 24 Dec, then Tue 29 Dec 2026: 25 (BH), 26–27 (weekend), 28 (BH) are not working days.
    const eps = sicknessEpisodes([sick('b', 'e1', '2026-12-29', '2026-12-30'), sick('a', 'e1', '2026-12-24', '2026-12-24')]);
    expect(eps).toHaveLength(1);
    expect(eps[0]!.startDate).toBe('2026-12-24');
  });

  it('marks an episode pregnancy-related if any part is', () => {
    const eps = sicknessEpisodes([sick('a', 'e1', '2026-02-06', '2026-02-06'), sick('b', 'e1', '2026-02-09', '2026-02-09', true)]);
    expect(eps[0]!.pregnancyRelated).toBe(true);
  });

  it('never merges different employees', () => {
    const eps = sicknessEpisodes([sick('a', 'e1', '2026-02-06', '2026-02-06'), sick('b', 'e2', '2026-02-09', '2026-02-09')]);
    expect(eps).toHaveLength(2);
  });

  it('merges anything after an open-ended absence, and the episode stays open-ended', () => {
    const eps = sicknessEpisodes([sick('a', 'e1', '2026-10-22', null), sick('b', 'e1', '2026-10-26', '2026-10-26')]);
    expect(eps).toHaveLength(1);
    expect(eps[0]!.endDate).toBeNull();
  });

  it('merges overlapping absences', () => {
    const eps = sicknessEpisodes([sick('a', 'e1', '2026-03-02', '2026-03-05'), sick('b', 'e1', '2026-03-04', '2026-03-06')]);
    expect(eps).toHaveLength(1);
    expect(eps[0]!.endDate).toBe('2026-03-06');
  });
});
