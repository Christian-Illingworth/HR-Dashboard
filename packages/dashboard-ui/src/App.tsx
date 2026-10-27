import { useState } from 'react';
import type { DashboardQuery, DashboardResponse } from '@hrd/core';
import type { DashboardClient } from './data/DashboardClient';
import { useDashboard } from './useDashboard';
import { SectionCard } from './components/SectionCard';
import { SectionState } from './components/SectionState';
import { MockDataNotice } from './components/MockDataNotice';
import { KpiRow } from './components/KpiRow';
import { LastUpdated } from './components/LastUpdated';
import { SalesList, SalesTabs, type SalesTab } from './components/SalesList';
import { FreshnessNotice } from './components/FreshnessNotice';
import { RefreshButton } from './components/RefreshButton';
import { ChartSection } from './charts/ChartSection';
import { attritionModel, attritionNotes } from './components/attritionChart';
import {
  absenceModel,
  absenceNotes,
  leaveModel,
  leaveNotes,
  sicknessModel,
  sicknessNotes,
} from './components/trendCharts';

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
          {data && <LastUpdated freshness={data.freshness} />}
        </div>
        {data && (
          <RefreshButton
            client={client}
            lastSuccessAt={data.freshness.lastSuccessAt}
            poll={async () => {
              const r = await client.getDashboard(query);
              return r.kind === 'ok' ? r.data.freshness.lastSuccessAt : null;
            }}
            onRefreshed={reload}
          />
        )}
      </header>

      {data?.meta.dataMode === 'sample' && <MockDataNotice />}
      {data && <FreshnessNotice freshness={data.freshness} />}

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

      <Sections
        sections={problem && !data ? errorSections : sections}
        historyStartDate={data?.coverage.historyStartDate ?? null}
      />
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

function Sections({
  sections,
  historyStartDate,
}: {
  sections: DashboardResponse['sections'] | undefined;
  historyStartDate: string | null;
}) {
  const [salesTab, setSalesTab] = useState<SalesTab>('today');
  return (
    <>
      <section className="hrd-section" aria-labelledby="hrd-kpis-title">
        <h3 className="visually-hidden" id="hrd-kpis-title">
          Headline numbers
        </h3>
        <SectionState section={sections?.kpis} emptyText="No headline numbers yet." loadingShape="list">
          {(kpis) => <KpiRow kpis={kpis} />}
        </SectionState>
      </section>
      <div className="hrd-grid">
        <ChartSection
          id="hrd-leave"
          title="Annual leave"
          section={sections?.leave}
          emptyText="No leave data yet."
          toModel={(d) => leaveModel(d, historyStartDate)}
          notes={(d) => leaveNotes(d, historyStartDate)}
        />
        <ChartSection
          id="hrd-sickness"
          title="Sickness"
          section={sections?.sickness}
          emptyText="No sickness data yet."
          toModel={(d) => sicknessModel(d, historyStartDate)}
          notes={(d) => sicknessNotes(d, historyStartDate)}
        />
        <ChartSection
          id="hrd-absence"
          title="Absence by type"
          section={sections?.absence}
          emptyText="No absence data yet."
          toModel={(d) => absenceModel(d, historyStartDate)}
          notes={(d) => absenceNotes(d, historyStartDate)}
        />
        <ChartSection
          id="hrd-attrition"
          title="Staff attrition"
          section={sections?.attrition}
          emptyText="No attrition data yet."
          toModel={attritionModel}
          notes={attritionNotes}
        />
        <SectionCard
          id="hrd-sales"
          title="Who's off in Sales"
          className="hrd-span-2"
          actions={<SalesTabs tab={salesTab} onChange={setSalesTab} />}
        >
          <SectionState section={sections?.salesAbsences} emptyText="No Sales absence data yet." loadingShape="list">
            {(sales) => <SalesList data={sales} tab={salesTab} />}
          </SectionState>
        </SectionCard>
      </div>
    </>
  );
}
