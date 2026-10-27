import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POLL_EVERY_MS, POLL_FOR_MS, RefreshButton } from '../src/components/RefreshButton';
import type { DashboardClient, RefreshResult } from '../src/data/DashboardClient';

const clientReturning = (result: RefreshResult): DashboardClient => ({
  getDashboard: async () => ({ kind: 'unavailable' }),
  requestRefresh: vi.fn(async () => result),
});

const flush = () => act(async () => undefined);

describe('RefreshButton', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('tells the user when the next refresh is available (15-minute limit)', async () => {
    render(
      <RefreshButton
        client={clientReturning({ kind: 'tooSoon', nextAllowedAt: '2026-10-27T10:45:00Z' })}
        lastSuccessAt="2026-10-27T09:00:00Z"
        poll={async () => null}
        onRefreshed={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('The next one is available at 10:45.');
  });

  it('polls every 15 seconds until "Last updated" changes, then reloads every section', async () => {
    const onRefreshed = vi.fn();
    const poll = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce('2026-10-27T09:00:00Z')
      .mockResolvedValueOnce('2026-10-27T10:31:00Z');
    render(
      <RefreshButton
        client={clientReturning({ kind: 'queued', nextAllowedAt: '2026-10-27T10:45:00Z' })}
        lastSuccessAt="2026-10-27T09:00:00Z"
        poll={poll}
        onRefreshed={onRefreshed}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await flush();
    expect(screen.getByText('Refreshing')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_EVERY_MS);
    });
    expect(onRefreshed).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_EVERY_MS);
    });
    expect(onRefreshed).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('gives up after 10 minutes and says so', async () => {
    render(
      <RefreshButton
        client={clientReturning({ kind: 'queued', nextAllowedAt: '2026-10-27T10:45:00Z' })}
        lastSuccessAt="2026-10-27T09:00:00Z"
        poll={async () => '2026-10-27T09:00:00Z'}
        onRefreshed={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await flush();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_FOR_MS + POLL_EVERY_MS);
    });
    expect(screen.getByRole('status')).toHaveTextContent('taking longer than usual');
  });

  it('says when a refresh could not be started', async () => {
    render(
      <RefreshButton client={clientReturning({ kind: 'unavailable' })} lastSuccessAt={null} poll={async () => null} onRefreshed={() => undefined} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('couldn’t be started');
  });
});
