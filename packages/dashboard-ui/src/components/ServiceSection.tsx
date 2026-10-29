// Length of service and work anniversaries (feature 002: M17, M18). Built from the kit's
// .kpi-strip, .bar-list and .list-row (research S6). Every value is written as text, so the bar
// list is its own text equivalent (002 FR-005).

import type { Section, ServiceData } from '@hrd/core';
import { formatDay } from '../format';
import { SectionCard } from './SectionCard';
import { SectionState } from './SectionState';

interface Props {
  section: Section<ServiceData> | undefined;
  /** The department filter in force ("All" for every department). */
  department: string;
}

const people = (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`;

export function ServiceSection({ section, department }: Props) {
  return (
    <SectionCard id="hrd-service" title="Length of service" className="hrd-span-2">
      <p className="caption hrd-service-sub">
        Current staff · from BrightHR start dates · {department === 'All' ? 'All departments' : department}
      </p>
      <SectionState
        section={section}
        emptyText={section?.message ?? 'No length of service data yet.'}
        loadingShape="list"
      >
        {(d) => (
          <div className="hrd-service">
            <div className="kpi-strip hrd-service-figures" role="group" aria-label="Length of service figures">
              <div className="kpi-mini">
                <span className="kpi-label">Average</span>
                <span className="kpi-value">{d.averageYears.toFixed(1)} yrs</span>
              </div>
              <div className="kpi-mini">
                <span className="kpi-label">Median</span>
                <span className="kpi-value">{d.medianYears.toFixed(1)} yrs</span>
              </div>
              <div className="kpi-mini">
                <span className="kpi-label">In first year</span>
                <span className="kpi-value">{d.firstYear}</span>
              </div>
            </div>
            <div className="hrd-service-body">
              <Bands bands={d.bands} />
              <Anniversaries list={d.anniversaries} />
            </div>
          </div>
        )}
      </SectionState>
    </SectionCard>
  );
}

/** M18. Milestones get the teal tone and a "Milestone" tag, so colour is never the only cue. */
function Anniversaries({ list }: { list: ServiceData['anniversaries'] }) {
  let body;
  if (!list.enabled) {
    body = <p className="caption hrd-anniversaries-note">Work anniversaries aren&apos;t switched on yet.</p>;
  } else if (list.entries.length === 0) {
    body = <p className="caption hrd-anniversaries-note">No work anniversaries in the next 3 months</p>;
  } else {
    body = (
      <div className="hrd-anniversaries-scroll" role="region" aria-label="Work anniversaries" tabIndex={0}>
        <ul className="hrd-anniversaries-list">
          {list.entries.map((e) => (
            <li key={`${e.date}-${e.name ?? ''}-${e.role}`} className="list-row hrd-anniversary">
              <span className={e.milestone ? 'badge tone-teal' : 'badge'}>{e.years === 1 ? '1 yr' : `${e.years} yrs`}</span>
              {e.milestone && <span className="tag tone-teal">Milestone</span>}
              <span className="hrd-anniversary-who">
                <strong>{e.name ?? 'Name not recorded'}</strong> · {e.role}
              </span>
              <span className="hrd-anniversary-date">{formatDay(e.date)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="hrd-anniversaries">
      <h4 className="hrd-subhead">Work anniversaries · next 3 months</h4>
      {body}
    </div>
  );
}

function Bands({ bands }: { bands: ServiceData['bands'] }) {
  const max = Math.max(...bands.map((b) => b.count));
  return (
    <ul className="bar-list hrd-service-bands" aria-label="Staff by length of service">
      {bands.map((b) => (
        <li key={b.band} aria-label={`${b.label}: ${people(b.count)}`}>
          <div className="bar-row" aria-hidden="true">
            <span className="bar-name">{b.label}</span>
            <span className="bar">
              <span style={{ width: `${max === 0 ? 0 : (b.count / max) * 100}%` }} />
            </span>
            <span className="bar-val">{b.count}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
