import type { Freshness } from '@hrd/core';
import { formatDateTime } from '../format';

/** FR-023: every view shows when the data was last successfully updated from BrightHR. */
export function LastUpdated({ freshness }: { freshness: Freshness }) {
  return (
    <p className="caption">
      {freshness.lastSuccessAt
        ? `Last updated ${formatDateTime(freshness.lastSuccessAt)}`
        : 'Not updated from BrightHR yet'}
    </p>
  );
}
