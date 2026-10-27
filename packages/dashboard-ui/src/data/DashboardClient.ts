// How the UI gets its data. Two implementations: SampleDashboardClient (mock data, in the
// browser) and the web part's ApiDashboardClient (the Function API through AadHttpClient).

import type { DashboardQuery, DashboardResponse } from '@hrd/core';

export type DashboardResult =
  | { kind: 'ok'; data: DashboardResponse }
  | { kind: 'forbidden' }
  | { kind: 'unauthenticated' }
  | { kind: 'badRequest' }
  | { kind: 'unavailable' };

export type RefreshResult =
  | { kind: 'queued' | 'alreadyRunning'; nextAllowedAt: string }
  | { kind: 'tooSoon'; nextAllowedAt: string }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' };

export interface DashboardClient {
  getDashboard(query: DashboardQuery): Promise<DashboardResult>;
  requestRefresh(): Promise<RefreshResult>;
}
