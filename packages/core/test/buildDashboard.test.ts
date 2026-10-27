// buildDashboard: query handling, filter options, metadata and per-section isolation (FR-026).
// Section values are covered by the metric tests and the later blocks in this file.
import { describe, expect, it } from 'vitest';
import { BadRequestError, buildDashboard, safeSection } from '../src/dashboard/buildDashboard';
import { sampleInput } from './sampleInput';

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

  it('isolates a failing section and does not leak the error text', () => {
    const section = safeSection(() => {
      throw new Error('detail that must not reach the browser');
    });
    expect(section).toEqual({ status: 'error', message: 'This section could not be calculated.' });
    expect(safeSection(() => ({ x: 1 }))).toEqual({ status: 'ok', data: { x: 1 } });
  });
});
