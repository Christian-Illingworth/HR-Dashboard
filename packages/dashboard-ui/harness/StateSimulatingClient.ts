// HARNESS ONLY. Wraps a client to simulate the states the dashboard must handle (FR-026,
// FR-024, US4), driven by ?state=. Never imported from src/, so it can't reach the web part
// bundle (scripts/check-bundle.mjs checks this).
import type { DashboardQuery, DashboardResponse } from '@hrd/core';
import type { DashboardClient, DashboardResult, RefreshResult } from '../src/data/DashboardClient';

export type SimulatedState =
  | 'loading'
  | 'noData'
  | 'staleFailed'
  | 'staleThreshold'
  | 'staleOvernight'
  | 'sectionError'
  | 'forbidden'
  | 'unauthenticated'
  | 'unavailable';

export const SIMULATED_STATES: readonly SimulatedState[] = [
  'loading',
  'noData',
  'staleFailed',
  'staleThreshold',
  'staleOvernight',
  'sectionError',
  'forbidden',
  'unauthenticated',
  'unavailable',
];

const empty = { status: 'empty' as const };

function adjust(state: SimulatedState, d: DashboardResponse): DashboardResponse {
  switch (state) {
    case 'noData':
      return {
        ...d,
        freshness: { ...d.freshness, noDataYet: true, lastSuccessAt: null, isStale: false, staleReason: null },
        sections: { kpis: empty, leave: empty, sickness: empty, absence: empty, attrition: empty, salesAbsences: empty },
      };
    case 'staleFailed':
      return {
        ...d,
        freshness: { ...d.freshness, isStale: true, staleReason: 'lastAttemptFailed', lastAttemptOutcome: 'Failed', lastAttemptAt: '2026-10-27T10:00:00.000Z' },
      };
    case 'staleThreshold':
      return {
        ...d,
        freshness: { ...d.freshness, isStale: true, staleReason: 'olderThanThreshold', lastSuccessAt: '2026-10-27T07:00:00.000Z' },
      };
    case 'staleOvernight':
      return {
        ...d,
        freshness: { ...d.freshness, isStale: true, staleReason: 'overnightMissed', lastSuccessAt: '2026-10-26T19:00:00.000Z' },
      };
    case 'sectionError':
      return { ...d, sections: { ...d.sections, sickness: { status: 'error', message: 'This section could not be calculated.' } } };
    default:
      return d;
  }
}

export class StateSimulatingClient implements DashboardClient {
  constructor(
    private readonly inner: DashboardClient,
    private readonly state: SimulatedState | null,
  ) {}

  async getDashboard(query: DashboardQuery): Promise<DashboardResult> {
    switch (this.state) {
      case 'loading':
        return new Promise<DashboardResult>(() => undefined);
      case 'forbidden':
      case 'unauthenticated':
      case 'unavailable':
        return { kind: this.state };
    }
    const result = await this.inner.getDashboard(query);
    if (result.kind !== 'ok' || this.state === null) return result;
    return { kind: 'ok', data: adjust(this.state, result.data) };
  }

  requestRefresh(): Promise<RefreshResult> {
    return this.inner.requestRefresh();
  }
}
