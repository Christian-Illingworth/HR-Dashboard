import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LastUpdated } from '../src/components/LastUpdated';

const base = { noDataYet: false, lastAttemptAt: null, lastAttemptOutcome: null, isStale: false, staleReason: null };

describe('LastUpdated', () => {
  it('shows the last successful update in UK time (GMT after 25 Oct 2026)', () => {
    render(<LastUpdated freshness={{ ...base, lastSuccessAt: '2026-10-27T09:00:00Z' }} />);
    expect(screen.getByText('Last updated 27 Oct 2026, 09:00')).toBeInTheDocument();
  });

  it('shows BST in summer', () => {
    render(<LastUpdated freshness={{ ...base, lastSuccessAt: '2026-07-01T08:00:00Z' }} />);
    expect(screen.getByText('Last updated 1 Jul 2026, 09:00')).toBeInTheDocument();
  });

  it('says when there has been no update yet', () => {
    render(<LastUpdated freshness={{ ...base, noDataYet: true, lastSuccessAt: null }} />);
    expect(screen.getByText('Not updated from BrightHR yet')).toBeInTheDocument();
  });
});
