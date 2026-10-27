// Chart legend: one entry per series (colour + pattern + words), then one per value kind shown
// (solid actual, tinted booked, dotted known, hatched dashed forecast) so nothing relies on colour.

import { useRef } from 'react';
import type { ChartModel } from './model';
import { styleOf } from './model';
import { Swatch } from './patterns';

let nextUid = 0;

export function Legend({ model }: { model: ChartModel }) {
  const uid = useRef(`hrdl${nextUid++}`).current;
  const parts = model.groups.flatMap((g) => g.parts);
  const styles = new Set(model.months.flatMap((m) => Object.values(m.values).map((v) => styleOf(v.kind))));
  const reference = parts[0]!;
  return (
    <ul className="hrd-legend" aria-label="Key">
      {parts.length > 1 &&
        parts.map((p) => (
          <li key={p.key}>
            <Swatch uid={uid} part={p} variant="actual" />
            {p.label}
          </li>
        ))}
      {model.line && (
        <li className={model.line.tone}>
          <svg className="hrd-swatch" width="22" height="14" viewBox="0 0 22 14" aria-hidden="true" focusable="false">
            <path className="hrd-line" d="M1,7 H21" />
            <circle className="hrd-marker" cx="11" cy="7" r="3.5" />
          </svg>
          {model.line.label}
        </li>
      )}
      {(['actual', 'booked', 'known', 'forecast'] as const)
        .filter((s) => styles.has(s))
        .map((s) => (
          <li key={s}>
            <Swatch uid={uid} part={reference} variant={s} />
            {s === 'actual' ? 'Actual' : s === 'booked' ? 'Booked' : s === 'known' ? 'Known' : 'Forecast (hatched, dashed edge)'}
          </li>
        ))}
    </ul>
  );
}
