// Mock-data client: runs the same calculations as the Function, in the browser, over the
// bundled synthetic fixtures (research R14). It never contacts a back end. Everything it shows
// is labelled "Mock data" because meta.dataMode is always "sample".

import type { DashboardQuery, SyncStatus } from '@hrd/core';
import type { DashboardClient, DashboardResult, RefreshResult } from './DashboardClient';

export interface SampleClientOptions {
  /** The sample "today" (YYYY-MM-DD). Defaults to 2026-10-27, the date the fixtures are built around. */
  today?: string;
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export class SampleDashboardClient implements DashboardClient {
  private readonly today: string;
  private lastRefreshAt: number | null = null;
  private refreshedStatus: SyncStatus | null = null;

  constructor(options: SampleClientOptions = {}) {
    this.today = options.today ?? '2026-10-27';
  }

  private async load() {
    const [core, data] = await Promise.all([import('@hrd/core'), import('./sampleData')]);
    // The clock is fixed at 10:30 UK time on the sample day, never the real clock, so the sample
    // data reads as fresh in a demo (tasks T034).
    const now = core.londonTimeToUtc(this.today, 10, 30);
    return { core, data, now };
  }

  async getDashboard(query: DashboardQuery): Promise<DashboardResult> {
    const { core, data, now } = await this.load();
    const settings = core.parseSettings(data.rawSettings);
    const built = core.buildRecords({
      employees: data.employees,
      absencesByEmployee: data.absencesByEmployee,
      entraUsers: data.entraUsers,
      settings,
      today: this.today,
    });
    const status: SyncStatus = {
      ...(this.refreshedStatus ?? data.status),
      lastManualRefreshAt: this.lastRefreshAt === null ? null : new Date(this.lastRefreshAt).toISOString(),
    };
    try {
      const response = core.buildDashboard({
        records: {
          employees: built.employees,
          absences: built.absences,
          history: data.history,
          reasons: core.selectSicknessReasons(built.employees, built.reasonCandidates, settings, this.today),
        },
        status,
        settings,
        query,
        today: this.today,
        now,
        syncIntervalHours: 1,
      });
      return { kind: 'ok', data: response };
    } catch (e) {
      if (e instanceof core.BadRequestError) return { kind: 'badRequest' };
      return { kind: 'unavailable' };
    }
  }

  /** Simulates the shared 15-minute limit; a "refresh" re-stamps the sample sync as just done. */
  async requestRefresh(): Promise<RefreshResult> {
    const { data, now } = await this.load();
    const nowMs = Date.parse(now);
    if (this.lastRefreshAt !== null && nowMs - this.lastRefreshAt < FIFTEEN_MINUTES) {
      return { kind: 'tooSoon', nextAllowedAt: new Date(this.lastRefreshAt + FIFTEEN_MINUTES).toISOString() };
    }
    this.lastRefreshAt = nowMs;
    this.refreshedStatus = { ...data.status, lastSuccessAt: now, lastAttemptStartedAt: now, lastAttemptFinishedAt: now };
    return { kind: 'queued', nextAllowedAt: new Date(nowMs + FIFTEEN_MINUTES).toISOString() };
  }
}
