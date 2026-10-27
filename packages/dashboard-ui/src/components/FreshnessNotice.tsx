// US4, FR-023, FR-024: say when the data is missing or out of date. The sections keep showing
// the most recent good figures underneath.

import type { Freshness } from '@hrd/core';
import { formatDateTime } from '../format';

export function FreshnessNotice({ freshness }: { freshness: Freshness }) {
  if (freshness.noDataYet) {
    return (
      <div className="notice tone-cyan" role="status">
        <span>
          <strong>No data yet.</strong> The first update from BrightHR hasn&apos;t happened, so there&apos;s nothing to show.
        </span>
      </div>
    );
  }
  if (!freshness.isStale) return null;

  const last = freshness.lastSuccessAt ? formatDateTime(freshness.lastSuccessAt) : 'unknown';
  switch (freshness.staleReason) {
    case 'lastAttemptFailed':
      return (
        <div className="notice tone-coral" role="alert">
          <span>
            <strong>The latest update from BrightHR failed.</strong> You&apos;re seeing data last updated {last}.
          </span>
        </div>
      );
    case 'overnightMissed':
      return (
        <div className="notice tone-amber" role="status">
          <span>
            <strong>Last night&apos;s update didn&apos;t complete.</strong> You&apos;re seeing data last updated {last}.
          </span>
        </div>
      );
    default:
      return (
        <div className="notice tone-amber" role="status">
          <span>
            <strong>This data may be out of date.</strong> It was last updated {last}.
          </span>
        </div>
      );
  }
}
