// US4, FR-025, research R8: ask for a refresh. One refresh every 15 minutes across all users;
// after a refresh is queued, poll until "Last updated" changes, then reload every section.

import { useEffect, useRef, useState } from 'react';
import type { DashboardClient } from '../data/DashboardClient';
import { formatTime } from '../format';
import { RefreshIcon } from './icons';

export const POLL_EVERY_MS = 15_000;
export const POLL_FOR_MS = 10 * 60_000;

interface Props {
  client: DashboardClient;
  /** The "Last updated" time on screen when the refresh was asked for. */
  lastSuccessAt: string | null;
  /** Fetches the latest "Last updated" time (null if it couldn't be read). */
  poll: () => Promise<string | null>;
  /** Called once new data has arrived, to reload every section. */
  onRefreshed: () => void;
}

type Phase = 'idle' | 'busy';

export function RefreshButton({ client, lastSuccessAt, poll, onRefreshed }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPhase('idle');
  };

  async function refresh() {
    setMessage('');
    const result = await client.requestRefresh();
    if (result.kind === 'tooSoon') {
      setMessage(`A refresh ran recently. The next one is available at ${formatTime(result.nextAllowedAt)}.`);
      return;
    }
    if (result.kind !== 'queued' && result.kind !== 'alreadyRunning') {
      setMessage('A refresh couldn’t be started. Try again later.');
      return;
    }
    setPhase('busy');
    setMessage('Getting the latest data from BrightHR. This can take a few minutes.');
    const started = Date.now();
    const before = lastSuccessAt;
    timer.current = setInterval(async () => {
      const latest = await poll();
      if (latest !== null && latest !== before) {
        stop();
        setMessage('');
        onRefreshed();
      } else if (Date.now() - started >= POLL_FOR_MS) {
        stop();
        setMessage('The refresh is taking longer than usual. New data will appear when it arrives.');
      }
    }, POLL_EVERY_MS);
  }

  return (
    <div className="hrd-header-actions">
      {phase === 'busy' ? (
        <span className="pill pill--static is-busy">Refreshing</span>
      ) : (
        <button type="button" className="btn-outline" onClick={refresh}>
          <RefreshIcon /> Refresh
        </button>
      )}
      <span className="caption" role="status" aria-live="polite">
        {message}
      </span>
    </div>
  );
}
