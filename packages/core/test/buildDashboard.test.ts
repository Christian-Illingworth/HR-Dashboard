// buildDashboard: query handling, filter options, metadata and per-section isolation (FR-026).
// Section values are covered by the metric tests and the later blocks in this file.
import { describe, expect, it } from 'vitest';
import { BadRequestError, buildDashboard, safeSection } from '../src/dashboard/buildDashboard';
import { round1 } from '../src/dashboard/round';
import { sampleInput } from './sampleInput';

// Rounded values from fixtures/expected/leave.md, sickness.md, absence.md, forecast-sickness.md.
describe('trend sections (US5)', () => {
  const res = buildDashboard(sampleInput());
  const months = ['2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];
  const kindsLeave = ['actual', 'actual', 'actual', 'toDate', 'booked', 'booked', 'booked'];

  it('leave: Jul 2026 – Jan 2027, October selected and current, approved days by kind', () => {
    const leave = res.sections.leave.data!;
    expect(leave.pendingAvailable).toBe(false);
    expect(leave.months.map((m) => m.month)).toEqual(months);
    expect(leave.months.map((m) => m.approvedDays.value)).toEqual([7, 7, 11, 9.5, 7, 12, 5]);
    expect(leave.months.map((m) => m.approvedDays.kind)).toEqual(kindsLeave);
    expect(leave.months.every((m) => m.pendingDays.value === null)).toBe(true);
    expect(leave.months.filter((m) => m.isSelected).map((m) => m.month)).toEqual(['2026-10']);
    expect(leave.months.map((m) => m.period)).toEqual(['actual', 'actual', 'actual', 'toDate', 'future', 'future', 'future']);
    expect(leave.months.every((m) => m.coverage === 'full')).toBe(true);
  });

  it('sickness: actuals, then the forecast labelled as such', () => {
    const s = res.sections.sickness.data!;
    expect(s).toMatchObject({ forecastBasisMonths: 12, notEnoughHistory: false });
    expect(s.months.map((m) => m.days.value)).toEqual([5, 2, 5, 6.5, 3.3, 3.3, 3.3]);
    expect(s.months.map((m) => m.episodes.value)).toEqual([1, 1, 2, 2, 1.3, 1.3, 1.3]);
    expect(s.months.map((m) => m.days.kind)).toEqual(['actual', 'actual', 'actual', 'toDate', 'forecast', 'forecast', 'forecast']);
  });

  it('absence by type: booked types and forecast sickness in future months', () => {
    const a = res.sections.absence.data!.months;
    expect(a.map((m) => [m.sickness.value, m.compassionate.value, m.unpaid.value, m.other.value])).toEqual([
      [5, 0, 0, 1],
      [2, 3, 0, 0],
      [5, 0, 0, 0.5],
      [6.5, 0, 0, 1],
      [3.3, 0, 0, 10],
      [3.3, 0, 2, 0],
      [3.3, 0, 0, 0],
    ]);
    expect(a[4]!.sickness.kind).toBe('forecast');
    expect(a[4]!.other.kind).toBe('booked');
    expect(a[3]!.other.kind).toBe('toDate');
  });

  it('launch: coverage marked, and no forecast without 3 full months', () => {
    const input = sampleInput();
    input.status = { ...input.status, historyStartDate: '2026-07-29' };
    const launch = buildDashboard(input);
    const s = launch.sections.sickness.data!;
    expect(s).toMatchObject({ notEnoughHistory: true, forecastBasisMonths: 2 });
    expect(s.months.map((m) => m.coverage)).toEqual(['partial', 'full', 'full', 'full', 'full', 'full', 'full']);
    expect(s.months[4]!.days).toEqual({ value: null, kind: 'forecast' });
    expect(launch.sections.absence.data!.months[4]!.sickness).toEqual({ value: null, kind: 'forecast' });
  });
});

// Rounded values from fixtures/expected/attrition.md.
describe('attrition section (US6)', () => {
  it('shows actual, known and forecast leavers apart, with starters and the rate', () => {
    const a = buildDashboard(sampleInput()).sections.attrition.data!;
    expect(a).toMatchObject({ forecastBasisMonths: 12, notEnoughHistory: false });
    const row = (i: number) => {
      const m = a.months[i]!;
      return [m.leaversActual.value, m.leaversKnown.value, m.leaversForecast.value, m.startersActual.value, m.startersKnown.value, m.ratePercent.value];
    };
    expect([0, 1, 2, 3, 4, 5, 6].map(row)).toEqual([
      [0, null, null, 0, null, 0],
      [1, null, null, 0, null, 6.9],
      [0, null, null, 0, null, 0],
      [1, 0, null, 0, 0, 7.1],
      [null, 0, 0.3, null, 1, null],
      [null, 1, 0, null, 0, null],
      [null, 0, 0.3, null, 0, null],
    ]);
    expect(a.months[3]!.leaversActual.kind).toBe('toDate');
    expect(a.months[5]!.leaversKnown.kind).toBe('known');
    expect(a.months[4]!.leaversForecast.kind).toBe('forecast');
    expect(a.months.every((m) => m.coverage === 'full')).toBe(true);
  });
});

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

// Rounded values from fixtures/expected/service.md (feature 002).
describe('length of service section (002 US1)', () => {
  it.each([
    ['All', {}, { averageYears: 5.4, medianYears: 4.8, firstYear: 0, counts: [0, 1, 2, 2, 3, 6] }],
    ['Sales', { department: 'Sales' }, { averageYears: 5.2, medianYears: 5.2, firstYear: 0, counts: [0, 0, 1, 0, 1, 2] }],
    ['Senior Energy Analyst', { role: 'Senior Energy Analyst' }, { averageYears: 7.9, medianYears: 7.9, firstYear: 0, counts: [0, 0, 0, 0, 1, 3] }],
    ['Pricing', { department: 'Pricing' }, { averageYears: 6.6, medianYears: 6.6, firstYear: 0, counts: [0, 0, 0, 0, 1, 1] }],
  ])('%s', (_name, query, expected) => {
    const service = buildDashboard(sampleInput({ query })).sections.service;
    expect(service.status).toBe('ok');
    expect(service.data).toMatchObject({ averageYears: expected.averageYears, medianYears: expected.medianYears, firstYear: expected.firstYear });
    expect(service.data!.bands.map((b) => b.count)).toEqual(expected.counts);
  });

  it('says "No staff in this group" for a group with nobody in it (002 FR-013)', () => {
    const service = buildDashboard(sampleInput({ query: { department: 'Sales', role: 'Senior Pricing Specialist' } })).sections.service;
    expect(service).toEqual({ status: 'empty', message: 'No staff in this group' });
  });

  it('is relative to today whatever month is picked (002 FR-012)', () => {
    const may = buildDashboard(sampleInput({ query: { month: '2026-05' } })).sections.service;
    expect(may).toEqual(buildDashboard(sampleInput()).sections.service);
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
