import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardQuery, DashboardResponse } from '@hrd/core';
import type { DashboardClient, DashboardResult } from './data/DashboardClient';

export interface DashboardState {
  /** The latest good response; kept on screen while a new query loads (US7). */
  data: DashboardResponse | null;
  /** The outcome of the latest request when it wasn't "ok". */
  problem: Exclude<DashboardResult, { kind: 'ok' }>['kind'] | null;
  loading: boolean;
  reload: () => void;
}

export function useDashboard(client: DashboardClient, query: DashboardQuery): DashboardState {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [problem, setProblem] = useState<DashboardState['problem']>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const request = ++latest.current;
    setLoading(true);
    client.getDashboard(query).then(
      (result) => {
        if (request !== latest.current) return;
        if (result.kind === 'ok') {
          setData(result.data);
          setProblem(null);
        } else {
          setProblem(result.kind);
        }
        setLoading(false);
      },
      () => {
        if (request !== latest.current) return;
        setProblem('unavailable');
        setLoading(false);
      },
    );
    // query is compared by value: the caller passes a new object only when a filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, query.month, query.department, query.role, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, problem, loading, reload };
}
