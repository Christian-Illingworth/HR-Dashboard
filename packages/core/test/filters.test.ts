// US7: every section respects the department, role and month filters. Expected values from
// fixtures/expected/filters.md (worked out by hand).
import { describe, expect, it } from 'vitest';
import { BadRequestError, buildDashboard } from '../src/dashboard/buildDashboard';
import { sampleInput } from './sampleInput';

const build = (query: { month?: string; department?: string; role?: string }) => buildDashboard(sampleInput({ query }));

describe('role: Senior Energy Analyst', () => {
  const res = build({ role: 'Senior Energy Analyst' });
  const s = res.sections;

  it('narrows every section', () => {
    expect(s.kpis.data).toMatchObject({ headcount: 4, onLeaveToday: 1, offSickToday: 1, bradfordAverage: { value: 2.8 } });
    expect(s.kpis.data!.attrition12m).toMatchObject({ percent: 0, leavers: 0, averageHeadcount: 4 });
    expect(s.leave.data!.months.map((m) => m.approvedDays.value)).toEqual([0, 0, 0, 0.5, 0, 5, 0]);
    expect(s.sickness.data!.months.map((m) => m.days.value)).toEqual([0, 0, 3, 6, 0.4, 0.4, 0.4]);
    expect(s.sickness.data!.months.map((m) => m.episodes.value)).toEqual([0, 0, 1, 1, 0.2, 0.2, 0.2]);
    expect(s.absence.data!.months.map((m) => m.other.value)).toEqual([0, 0, 0, 1, 10, 0, 0]);
    expect(s.attrition.data!.months[5]!.leaversKnown.value).toBe(1);
    expect(s.attrition.data!.months.map((m) => m.leaversForecast.value)).toEqual([null, null, null, null, 0, 0, 0]);
    expect(s.salesAbsences.data!.today.map((e) => e.name)).toEqual(['Chloe Patel']);
    expect(s.salesAbsences.data!.upcoming.map((e) => e.name)).toEqual(['Chloe Patel']);
  });

  it('narrows length of service and anniversaries (002 US3; service.md)', () => {
    expect(s.service.data).toMatchObject({ averageYears: 7.9, medianYears: 7.9, firstYear: 0 });
    expect(s.service.data!.bands.map((b) => b.count)).toEqual([0, 0, 0, 0, 1, 3]);
    expect(s.service.data!.anniversaries.entries.map((e) => e.name)).toEqual(['Grace Lindqvist', 'Chloe Patel', 'Noah Achebe']);
  });
});

describe('department: Pricing', () => {
  const s = build({ department: 'Pricing' }).sections;
  it('narrows the KPIs and puts Sales outside the filter', () => {
    expect(s.kpis.data).toMatchObject({ headcount: 2, onLeaveToday: 0, offSickToday: 0 });
    expect(s.salesAbsences.data!.outsideFilter).toBe(true);
    expect(s.attrition.data!.months[4]!.startersKnown.value).toBe(1);
  });

  it('narrows length of service; no anniversaries in the window (002 US3; service.md)', () => {
    expect(s.service.data).toMatchObject({ averageYears: 6.6, medianYears: 6.6, firstYear: 0 });
    expect(s.service.data!.bands.map((b) => b.count)).toEqual([0, 0, 0, 0, 1, 1]);
    expect(s.service.data!.anniversaries).toMatchObject({ enabled: true, entries: [] });
  });
});

describe('month: May 2026', () => {
  const res = build({ month: '2026-05' });
  const today = build({});

  it('moves the window to Feb – Aug 2026, all actual, with no forecasts', () => {
    const leave = res.sections.leave.data!.months;
    expect(leave.map((m) => m.month)).toEqual(['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
    expect(leave.map((m) => m.approvedDays.value)).toEqual([5, 0, 0, 4, 0, 7, 7]);
    expect(leave.find((m) => m.isSelected)!.month).toBe('2026-05');
    expect(leave.every((m) => m.period === 'actual' && m.approvedDays.kind === 'actual')).toBe(true);
    const sick = res.sections.sickness.data!.months;
    expect(sick.map((m) => m.days.value)).toEqual([4, 3, 2, 4, 2, 5, 2]);
    expect(sick.map((m) => m.episodes.value)).toEqual([2, 1, 1, 2, 1, 1, 1]);
    expect(sick.some((m) => m.days.kind === 'forecast')).toBe(false);
    expect(res.sections.attrition.data!.months.some((m) => m.leaversForecast.value !== null)).toBe(false);
  });

  it('leaves the "today" KPIs and the Sales list unchanged (FR-022)', () => {
    expect(res.sections.kpis).toEqual(today.sections.kpis);
    expect(res.sections.salesAbsences).toEqual(today.sections.salesAbsences);
  });

  it('leaves the length of service section unchanged (002 FR-012)', () => {
    expect(res.sections.service).toEqual(today.sections.service);
  });
});

describe('someone who changed department (D3)', () => {
  it('counts July sickness under the department the person was in then', () => {
    const july = (department: string) =>
      build({ month: '2026-07', department }).sections.sickness.data!.months.find((m) => m.month === '2026-07')!.days.value;
    expect(july('Sales')).toBe(0);
    expect(july('Analysis')).toBe(2);
    expect(build({}).coverage.departmentHistoryStartMonth).toBe('2025-10');
  });
});

describe('options that are not offered', () => {
  it.each([[{ month: '2025-12' }], [{ department: 'Marketing' }], [{ role: 'Chief Llama' }]])('%j → badRequest', (query) => {
    expect(() => build(query)).toThrow(BadRequestError);
  });
});
