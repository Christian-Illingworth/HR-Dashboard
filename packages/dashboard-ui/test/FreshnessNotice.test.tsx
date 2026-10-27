import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Freshness } from '@hrd/core';
import { FreshnessNotice } from '../src/components/FreshnessNotice';

const fresh: Freshness = {
  noDataYet: false,
  lastSuccessAt: '2026-10-27T09:00:00Z',
  lastAttemptAt: '2026-10-27T08:58:00Z',
  lastAttemptOutcome: 'Succeeded',
  isStale: false,
  staleReason: null,
};

describe('FreshnessNotice', () => {
  it('shows nothing when the data is fresh', () => {
    const { container } = render(<FreshnessNotice freshness={fresh} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says there is no data yet', () => {
    render(<FreshnessNotice freshness={{ ...fresh, noDataYet: true, lastSuccessAt: null }} />);
    expect(screen.getByRole('status')).toHaveTextContent('No data yet.');
  });

  it('says the latest update failed, and when data was last updated', () => {
    render(<FreshnessNotice freshness={{ ...fresh, isStale: true, staleReason: 'lastAttemptFailed', lastAttemptOutcome: 'Failed' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The latest update from BrightHR failed. You’re seeing data last updated 27 Oct 2026, 09:00.'.replace('’', "'"),
    );
  });

  it('says the data may be out of date', () => {
    render(<FreshnessNotice freshness={{ ...fresh, isStale: true, staleReason: 'olderThanThreshold' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('This data may be out of date. It was last updated 27 Oct 2026, 09:00.');
  });

  it('says last night’s update did not complete', () => {
    render(<FreshnessNotice freshness={{ ...fresh, isStale: true, staleReason: 'overnightMissed' }} />);
    expect(screen.getByRole('status')).toHaveTextContent("Last night's update didn't complete.");
  });
});
