import { useState } from 'react';
import type { DashboardQuery, DashboardResponse } from '@hrd/core';
import type { DashboardClient } from './data/DashboardClient';
import { useDashboard } from './useDashboard';
import { SectionCard } from './components/SectionCard';
import { SectionState } from './components/SectionState';
import { MockDataNotice } from './components/MockDataNotice';

export interface AppProps {
  client: DashboardClient;
  /** Who to contact about access (web part property; shown on the no-access screen). */
  noAccessContact: string;
}

export function App({ client, noAccessContact }: AppProps) {
  const [query] = useState<DashboardQuery>({});
  const { data, problem, loading, reload } = useDashboard(client, query);

  if (problem === 'forbidden' || problem === 'unauthenticated') {
    // Replaced by the NoAccess screen in tasks T122.
    return (
      <div className="hrd-dashboard">
        <div className="notice tone-coral" role="alert">
          You don&apos;t have access to the HR Dashboard. {noAccessContact}
        </div>
      </div>
    );
  }

  const sections = data?.sections;
  return (
    <div className="hrd-dashboard" aria-busy={loading}>
      <header className="hrd-header">
        <div className="hrd-header-meta">
          <h2 className="title-xl">HR Dashboard</h2>
        </div>
      </header>

      {data?.meta.dataMode === 'sample' && <MockDataNotice />}

      {problem && !data && (
        <div className="notice tone-coral" role="alert">
          <span>
            The dashboard couldn&apos;t load its data.{' '}
            <button type="button" className="btn-link" onClick={reload}>
              Try again
            </button>
          </span>
        </div>
      )}
      {problem && data && (
        <div className="notice tone-coral" role="alert">
          <span>
            The latest update couldn&apos;t be loaded, so you&apos;re seeing the previous figures.{' '}
            <button type="button" className="btn-link" onClick={reload}>
              Try again
            </button>
          </span>
        </div>
      )}

      <Sections sections={problem && !data ? errorSections : sections} />
    </div>
  );
}

const sectionError = { status: 'error' as const, message: 'This section could not be loaded.' };
const errorSections: DashboardResponse['sections'] = {
  kpis: sectionError,
  leave: sectionError,
  sickness: sectionError,
  absence: sectionError,
  attrition: sectionError,
  salesAbsences: sectionError,
};

function Sections({ sections }: { sections: DashboardResponse['sections'] | undefined }) {
  return (
    <>
      <SectionCard id="hrd-kpis" title="Headline numbers">
        <SectionState section={sections?.kpis} emptyText="No headline numbers yet." loadingShape="list">
          {() => null}
        </SectionState>
      </SectionCard>
      <div className="hrd-grid">
        <SectionCard id="hrd-leave" title="Annual leave">
          <SectionState section={sections?.leave} emptyText="No leave data yet.">
            {() => null}
          </SectionState>
        </SectionCard>
        <SectionCard id="hrd-sickness" title="Sickness">
          <SectionState section={sections?.sickness} emptyText="No sickness data yet.">
            {() => null}
          </SectionState>
        </SectionCard>
        <SectionCard id="hrd-absence" title="Absence by type">
          <SectionState section={sections?.absence} emptyText="No absence data yet.">
            {() => null}
          </SectionState>
        </SectionCard>
        <SectionCard id="hrd-attrition" title="Staff attrition">
          <SectionState section={sections?.attrition} emptyText="No attrition data yet.">
            {() => null}
          </SectionState>
        </SectionCard>
        <SectionCard id="hrd-sales" title="Who's off in Sales" className="hrd-span-2">
          <SectionState section={sections?.salesAbsences} emptyText="No Sales absence data yet." loadingShape="list">
            {() => null}
          </SectionState>
        </SectionCard>
      </div>
    </>
  );
}
