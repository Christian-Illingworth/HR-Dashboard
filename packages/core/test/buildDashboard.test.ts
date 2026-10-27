// buildDashboard: query handling, filter options, metadata and per-section isolation (FR-026).
// Section values are covered by the metric tests and the later blocks in this file.
import { describe, expect, it } from 'vitest';
import { BadRequestError, buildDashboard, safeSection } from '../src/dashboard/buildDashboard';
import { round1 } from '../src/dashboard/round';
import { sampleInput } from './sampleInput';

describe('freshness and refresh (US4)', () => {
  it('reports the sample data as fresh at 10:30, with a refresh allowed now', () => {
    const res = buildDashboard(sampleInput());
    expect(res.freshness).toEqual({
      noDataYet: false,
      lastSuccessAt: '2026-10-27T09:00:00Z',
      lastAttemptAt: '2026-10-27T08:58:00Z',
      lastAttemptOutcome: 'Succeeded',
      isStale: false,
      staleReason: null,
    });
    expect(res.refresh.nextAllowedAt).toBe('2026-10-27T10:30:00.000Z');
  });

  it('shows "No data yet" (empty sections), not zeros, before the first successful sync', () => {
    const input = sampleInput();
    input.status = { ...input.status, lastSuccessAt: null, historyStartDate: null };
    input.records = { employees: [], absences: [], history: [], reasons: [] };
    const res = buildDashboard(input);
    expect(res.freshness.noDataYet).toBe(true);
    expect(Object.values(res.sections).every((s) => s.status === 'empty')).toBe(true);
  });

  it('uses the interval passed in and the last manual refresh from the status', () => {
    const input = sampleInput({ now: '2026-10-27T11:30:00.000Z' });
    input.status = { ...input.status, lastManualRefreshAt: '2026-10-27T11:20:00Z' };
    expect(buildDashboard(input).freshness.staleReason).toBe('olderThanThreshold');
    expect(buildDashboard({ ...input, syncIntervalHours: 2 }).freshness.isStale).toBe(false);
    expect(buildDashboard(input).refresh.nextAllowedAt).toBe('2026-10-27T11:35:00.000Z');
  });
});

describe('Sales section (US3)', () => {
  it('puts sickness reasons in the Sales section and nowhere else (FR-006)', () => {
    const res = buildDashboard(sampleInput());
    expect(res.sections.salesAbsences.status).toBe('ok');
    expect(JSON.stringify(res.sections.salesAbsences)).toContain('Back pain');
    const { salesAbsences: _sales, ...otherSections } = res.sections;
    expect(JSON.stringify({ ...res, sections: otherSections })).not.toContain('Back pain');
  });

  it('is relative to today whatever month is picked (FR-022)', () => {
    const may = buildDashboard(sampleInput({ query: { month: '2026-05' } })).sections.salesAbsences;
    expect(may).toEqual(buildDashboard(sampleInput()).sections.salesAbsences);
  });
});

// Rounded values from fixtures/expected/kpis.md.
describe('KPI section (US1)', () => {
  it.each([
    [
      'All',
      {},
      { headcount: 14, onLeaveToday: 2, offSickToday: 2, attrition12m: { percent: 31.6, leavers: 5, averageHeadcount: 15.8, noStaff: false }, bradfordAverage: { value: 3.8, noStaff: false, basisStartDate: '2025-10-29', basisIsPartial: false } },
    ],
    [
      'Sales',
      { department: 'Sales' },
      { headcount: 4, onLeaveToday: 1, offSickToday: 1, attrition12m: { percent: 25, leavers: 1, averageHeadcount: 4, noStaff: false }, bradfordAverage: { value: 7, noStaff: false, basisStartDate: '2025-10-29', basisIsPartial: false } },
    ],
    [
      'Senior Energy Analyst',
      { role: 'Senior Energy Analyst' },
      { headcount: 4, onLeaveToday: 1, offSickToday: 1, attrition12m: { percent: 0, leavers: 0, averageHeadcount: 4, noStaff: false }, bradfordAverage: { value: 2.8, noStaff: false, basisStartDate: '2025-10-29', basisIsPartial: false } },
    ],
    [
      'Sales + Senior Pricing Specialist',
      { department: 'Sales', role: 'Senior Pricing Specialist' },
      { headcount: 0, onLeaveToday: 0, offSickToday: 0, attrition12m: { percent: null, leavers: 0, averageHeadcount: 0, noStaff: true }, bradfordAverage: { value: null, noStaff: true, basisStartDate: '2025-10-29', basisIsPartial: false } },
    ],
  ])('%s', (_name, query, expected) => {
    const kpis = buildDashboard(sampleInput({ query })).sections.kpis;
    expect(kpis).toEqual({ status: 'ok', data: expected });
  });
});

describe('buildDashboard skeleton', () => {
  const res = buildDashboard(sampleInput());

  it('fills meta from the status and the clock passed in', () => {
    expect(res.meta).toEqual({ dataMode: 'sample', today: '2026-10-27', generatedAt: '2026-10-27T10:30:00.000Z' });
  });

  it('defaults the query to the current month and "All"', () => {
    expect(res.filters.applied).toEqual({ month: '2026-10', department: 'All', role: 'All' });
  });

  it('offers "All" then current departments and roles A–Z, including "Not set"', () => {
    expect(res.filters.options.departments).toEqual(['All', 'Analysis', 'Not set', 'Operations', 'Pricing', 'Sales']);
    expect(res.filters.options.roles).toEqual([
      'All',
      'Energy Analyst',
      'Sales Team Manager',
      'Senior Energy Analyst',
      'Senior Pricing Specialist',
    ]);
    expect(res.filters.options.months).toEqual([
      '2026-10', '2026-09', '2026-08', '2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01',
    ]);
  });

  it('reports coverage', () => {
    expect(res.coverage).toEqual({ historyStartDate: '2025-10-01', departmentHistoryStartMonth: '2025-10' });
  });

  it('rejects options that are not offered', () => {
    expect(() => buildDashboard(sampleInput({ query: { month: '2025-12' } }))).toThrow(BadRequestError);
    expect(() => buildDashboard(sampleInput({ query: { department: 'Marketing' } }))).toThrow(BadRequestError);
    expect(() => buildDashboard(sampleInput({ query: { role: 'Chief Llama' } }))).toThrow(BadRequestError);
  });

  it('rounds to 1 decimal place, half away from zero (D8)', () => {
    expect(round1(3.75)).toBe(3.8);
    expect(round1(2.75)).toBe(2.8);
    expect(round1(31.553398)).toBe(31.6);
    expect(round1(0.04)).toBe(0);
    expect(round1(null)).toBeNull();
  });

  it('isolates a failing section and does not leak the error text', () => {
    const section = safeSection(() => {
      throw new Error('detail that must not reach the browser');
    });
    expect(section).toEqual({ status: 'error', message: 'This section could not be calculated.' });
    expect(safeSection(() => ({ x: 1 }))).toEqual({ status: 'ok', data: { x: 1 } });
  });
});
