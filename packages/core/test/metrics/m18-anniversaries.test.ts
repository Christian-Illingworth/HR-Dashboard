// M18 work anniversaries (feature 002). Expected values from fixtures/expected/service.md (worked
// out by hand) and inline edge cases. Today is 2026-10-27, so the window runs to 2027-01-27.
import { describe, expect, it } from 'vitest';
import { anniversaries } from '../../src/metrics/anniversaries';
import { employee, fixtureContext, inlineContext } from '../contextFor';

const named = (givenName: string, familyName: string, over = {}) => employee({ givenName, familyName, ...over });
const brief = (r: ReturnType<typeof anniversaries>) => r.entries.map((e) => `${e.name} ${e.years} ${e.date}${e.milestone ? ' M' : ''}`);

describe('M18 work anniversaries (fixtures)', () => {
  it('All: four anniversaries in date order; Kara Whitfield leaves before hers', () => {
    const r = anniversaries(fixtureContext());
    expect(r.from).toBe('2026-10-27');
    expect(r.to).toBe('2027-01-27');
    expect(brief(r)).toEqual([
      'Grace Lindqvist 10 2026-11-06 M',
      'Chloe Patel 5 2026-12-01 M',
      'Noah Achebe 6 2027-01-04',
      'Daniel Reyes 3 2027-01-08',
    ]);
    expect(r.entries.map((e) => e.role)).toEqual(['Senior Energy Analyst', 'Senior Energy Analyst', 'Senior Energy Analyst', 'Energy Analyst']);
  });

  it('Sales: Chloe Patel and Daniel Reyes', () => {
    expect(brief(anniversaries(fixtureContext({ department: 'Sales' })))).toEqual(['Chloe Patel 5 2026-12-01 M', 'Daniel Reyes 3 2027-01-08']);
  });

  it('Senior Energy Analyst: Grace Lindqvist, Chloe Patel and Noah Achebe', () => {
    expect(brief(anniversaries(fixtureContext({ role: 'Senior Energy Analyst' })))).toEqual([
      'Grace Lindqvist 10 2026-11-06 M',
      'Chloe Patel 5 2026-12-01 M',
      'Noah Achebe 6 2027-01-04',
    ]);
  });

  it('Pricing: none in the window', () => {
    expect(anniversaries(fixtureContext({ department: 'Pricing' })).entries).toEqual([]);
  });
});

describe('M18 edge cases', () => {
  const run = (employees: ReturnType<typeof employee>[], today?: string) =>
    anniversaries(inlineContext({ employees }, today ? { today } : {}));

  it('lists an anniversary that is today', () => {
    expect(brief(run([named('Ann', 'Ash', { startDate: '2020-10-27' })]))).toEqual(['Ann Ash 6 2026-10-27']);
  });

  it('leaves out someone who leaves the day before, and lists someone who leaves on the day', () => {
    const before = named('Bea', 'Birch', { startDate: '2020-11-10', endDate: '2026-11-09' });
    const onTheDay = named('Cal', 'Cedar', { startDate: '2020-11-10', endDate: '2026-11-10' });
    expect(brief(run([before, onTheDay]))).toEqual(['Cal Cedar 6 2026-11-10']);
  });

  it('lists a first anniversary as 1 year', () => {
    expect(brief(run([named('Dan', 'Dale', { startDate: '2025-12-01' })]))).toEqual(['Dan Dale 1 2026-12-01']);
  });

  it('does not list a start date in the window as an anniversary (0 years)', () => {
    expect(run([named('Eve', 'Elm', { startDate: '2026-10-27' }), named('Fay', 'Fir', { startDate: '2026-11-16' })]).entries).toEqual([]);
  });

  it('lists a 29 February start on 28 February in a year without one', () => {
    // Today 2027-02-01: the window runs to 2027-05-01.
    expect(brief(run([named('Gil', 'Gorse', { startDate: '2024-02-29' })], '2027-02-01'))).toEqual(['Gil Gorse 3 2027-02-28']);
  });

  it('orders several on one day by family name, then given name', () => {
    const start = { startDate: '2020-11-10' };
    expect(run([named('Ann', 'Zed', start), named('Bob', 'Adams', start), named('Amy', 'Adams', start)]).entries.map((e) => e.name)).toEqual([
      'Amy Adams',
      'Bob Adams',
      'Ann Zed',
    ]);
  });

  it('clamps the window end to the last day of the month', () => {
    const r = run([named('Hal', 'Holly', { startDate: '2020-02-28' })], '2026-11-30');
    expect(r.to).toBe('2027-02-28');
    expect(brief(r)).toEqual(['Hal Holly 7 2027-02-28']);
  });

  it('marks multiples of 5 years as milestones, and nothing else', () => {
    const r = run([
      named('Ivy', 'Iris', { startDate: '2021-11-02' }),
      named('Jo', 'Juniper', { startDate: '2016-11-03' }),
      named('Kit', 'Kale', { startDate: '2020-11-04' }),
    ]);
    expect(r.entries.map((e) => [e.years, e.milestone])).toEqual([
      [5, true],
      [10, true],
      [6, false],
    ]);
  });

  it('lists someone with no name stored, with a null name', () => {
    expect(run([employee({ startDate: '2020-11-10' })]).entries).toEqual([
      { name: null, role: 'Energy Analyst', date: '2026-11-10', years: 6, milestone: false },
    ]);
  });

  it('gives an empty list when nothing falls in the window', () => {
    expect(run([named('Lou', 'Lime', { startDate: '2020-06-01' })]).entries).toEqual([]);
  });
});
