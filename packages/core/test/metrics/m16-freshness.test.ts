// M16 freshness. Each row is a case from fixtures/expected/freshness.md (worked out by hand).
// syncIntervalHours is passed in; it is never read from the environment.
import { describe, expect, it } from 'vitest';
import { freshness, nextAllowedRefresh } from '../../src/metrics/freshness';
import { baseStatus } from '../contextFor';
import type { SyncOutcome } from '../../src/records/types';

const status = (lastSuccessAt: string | null, outcome: SyncOutcome | null) => ({
  ...baseStatus,
  lastSuccessAt,
  lastAttemptOutcome: outcome,
  lastAttemptStartedAt: lastSuccessAt,
});

const cases: [number, string, string | null, SyncOutcome | null, 1 | 2, { isStale: boolean; staleReason: string | null; noDataYet?: boolean }][] = [
  [1, '2026-11-02T07:00:00Z', '2026-11-02T02:05:00Z', 'Succeeded', 1, { isStale: false, staleReason: null }],
  [2, '2026-10-27T02:10:00Z', '2026-10-26T19:05:00Z', 'Running', 1, { isStale: false, staleReason: null }],
  [3, '2026-10-27T10:30:00Z', '2026-10-27T09:00:00Z', 'Failed', 1, { isStale: true, staleReason: 'lastAttemptFailed' }],
  [4, '2026-10-27T11:30:00Z', '2026-10-27T09:00:00Z', 'Succeeded', 1, { isStale: true, staleReason: 'olderThanThreshold' }],
  [5, '2026-10-27T11:30:00Z', '2026-10-27T09:00:00Z', 'Succeeded', 2, { isStale: false, staleReason: null }],
  [6, '2026-10-31T21:00:00Z', '2026-10-30T19:05:00Z', 'Succeeded', 1, { isStale: true, staleReason: 'overnightMissed' }],
  [7, '2026-10-27T10:30:00Z', null, null, 1, { isStale: false, staleReason: null, noDataYet: true }],
  [8, '2026-11-02T07:30:00Z', '2026-11-01T02:05:00Z', 'Succeeded', 1, { isStale: true, staleReason: 'overnightMissed' }],
  [9, '2026-10-27T09:05:00Z', '2026-10-27T02:05:00Z', 'Succeeded', 1, { isStale: true, staleReason: 'olderThanThreshold' }],
  [10, '2026-07-01T07:30:00Z', '2026-07-01T06:10:00Z', 'Succeeded', 1, { isStale: false, staleReason: null }],
  [11, '2026-10-27T10:30:00Z', '2026-10-27T09:00:00Z', 'Succeeded', 1, { isStale: false, staleReason: null }],
];

describe('M16 freshness', () => {
  it.each(cases)('case %i: now %s, last success %s, %s, interval %i', (_n, now, lastSuccessAt, outcome, interval, expected) => {
    const f = freshness({ status: status(lastSuccessAt, outcome), now, syncIntervalHours: interval });
    expect(f).toMatchObject({ noDataYet: expected.noDataYet ?? false, ...expected });
    expect(f.lastSuccessAt).toBe(lastSuccessAt);
    expect(f.lastAttemptOutcome).toBe(outcome);
  });
});

describe('next refresh allowed (FR-025)', () => {
  const now = '2026-10-27T10:30:00Z';
  it('is 15 minutes after the last manual refresh if that is still ahead', () => {
    expect(nextAllowedRefresh('2026-10-27T10:20:00Z', now)).toBe('2026-10-27T10:35:00.000Z');
  });
  it('is now when the 15 minutes have passed, or there has been no refresh', () => {
    expect(nextAllowedRefresh('2026-10-27T10:00:00Z', now)).toBe('2026-10-27T10:30:00.000Z');
    expect(nextAllowedRefresh(null, now)).toBe('2026-10-27T10:30:00.000Z');
  });
});
