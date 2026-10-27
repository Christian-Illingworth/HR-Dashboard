// US1, FR-007: five headline numbers in the kit's KPI strip. Metric IDs refer to
// docs/metric-catalogue.md.

import type { Kpis } from '@hrd/core';
import { formatDate, formatNumber } from '../format';

const NO_STAFF = 'No staff in this group';

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="kpi-mini" role="group" aria-label={label}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

export function KpiRow({ kpis }: { kpis: Kpis }) {
  const { attrition12m: attrition, bradfordAverage: bradford } = kpis;
  return (
    <div className="kpi-strip hrd-kpis">
      <Kpi label="Headcount" value={String(kpis.headcount)} sub="People employed today" />
      <Kpi label="On leave today" value={String(kpis.onLeaveToday)} sub="Approved annual leave" />
      <Kpi label="Off sick today" value={String(kpis.offSickToday)} sub="Including half days" />
      <Kpi
        label="Attrition, last 12 months"
        value={attrition.noStaff || attrition.percent === null ? '–' : `${formatNumber(attrition.percent)}%`}
        sub={
          attrition.noStaff
            ? NO_STAFF
            : `${attrition.leavers} ${attrition.leavers === 1 ? 'leaver' : 'leavers'}, average headcount ${formatNumber(attrition.averageHeadcount)}`
        }
      />
      <Kpi
        label="Average Bradford Factor"
        value={bradford.noStaff || bradford.value === null ? '–' : formatNumber(bradford.value)}
        sub={
          bradford.noStaff
            ? NO_STAFF
            : bradford.basisIsPartial
              ? `Based on data since ${formatDate(bradford.basisStartDate)}`
              : 'Last 52 weeks'
        }
      />
    </div>
  );
}
