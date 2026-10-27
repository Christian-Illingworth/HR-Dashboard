// US3, FR-019, FR-020: who in Sales is off today or in the next 14 days.

import type { SalesData, SalesEntry } from '@hrd/core';
import { formatDay } from '../format';
import { UsersIcon } from './icons';

type Tab = 'today' | 'upcoming';

function startText(e: SalesEntry): string {
  const day = formatDay(e.start.date);
  const sameDay = e.end?.date === e.start.date;
  if (sameDay && e.start.part === 'FirstHalf' && e.end?.part === 'FirstHalf') return `${day} (morning)`;
  if (sameDay && e.start.part === 'SecondHalf' && e.end?.part === 'SecondHalf') return `${day} (afternoon)`;
  return e.start.part === 'SecondHalf' ? `${day} (from the afternoon)` : day;
}

function endText(e: SalesEntry): string {
  if (!e.end) return 'Not yet known';
  const day = formatDay(e.end.date);
  if (e.end.date === e.start.date) return day;
  return e.end.part === 'FirstHalf' ? `${day} (until midday)` : day;
}

export function SalesTabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="seg" role="group" aria-label="Show who is off">
      {(['today', 'upcoming'] as const).map((t) => (
        <button
          key={t}
          type="button"
          className={`seg-btn${tab === t ? ' is-on' : ''}`}
          aria-pressed={tab === t}
          onClick={() => onChange(t)}
        >
          {t === 'today' ? 'Today' : 'Next 14 days'}
        </button>
      ))}
    </div>
  );
}

export function SalesList({ data, tab }: { data: SalesData; tab: Tab }) {
  const notFound = data.departmentsNotFound.length > 0 && (
    <div className="notice tone-amber" role="note">
      <span>
        Nobody is in the Sales department{data.departmentsNotFound.length > 1 ? 's' : ''}{' '}
        {data.departmentsNotFound.map((d) => `“${d}”`).join(', ')}. Check the Sales department names in the
        dashboard settings.
      </span>
    </div>
  );

  if (data.outsideFilter) {
    return (
      <div className="empty-state hrd-state">
        <UsersIcon />
        <span>Sales is outside the current department filter.</span>
      </div>
    );
  }

  const entries = tab === 'today' ? data.today : data.upcoming;
  const label = tab === 'today' ? 'Sales absences today' : 'Sales absences in the next 14 days';

  return (
    <div className="stack">
      {notFound}
      {entries.length === 0 ? (
        <div className="empty-state hrd-state">
          <UsersIcon />
          <span>{tab === 'today' ? 'Nobody in Sales is off today.' : 'Nobody in Sales is off in the next 14 days.'}</span>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="table hrd-stack-table">
            <caption className="visually-hidden">{label}</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Absence</th>
                <th scope="col">Start</th>
                <th scope="col">End</th>
                <th scope="col">Back on</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={`${e.name}-${e.start.date}-${i}`}>
                  <td data-label="Name" className="table-name">
                    {e.name}
                  </td>
                  <td data-label="Role">{e.role}</td>
                  <td data-label="Absence">
                    {e.absenceType}
                    {e.sicknessReason && <div className="table-sub">Reason: {e.sicknessReason}</div>}
                  </td>
                  <td data-label="Start">{startText(e)}</td>
                  <td data-label="End">{endText(e)}</td>
                  <td data-label="Back on">{e.returnDate ? formatDay(e.returnDate) : 'Not yet known'}</td>
                  <td data-label="Status">
                    <span className={`status ${e.status === 'Approved' ? 'tone-green' : 'tone-midteal'}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!data.pendingAvailable && (
        <p className="caption">Pending requests: not available from BrightHR yet. Only approved absences are shown.</p>
      )}
    </div>
  );
}

export type { Tab as SalesTab };
