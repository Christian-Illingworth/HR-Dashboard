// FR-018: every chart has an equivalent table that keyboard and screen reader users can reach.
// Same model, same values and kind labels as the chart and its tooltip.

import { formatMonth, formatNumber } from '../format';
import { KIND_LABEL, type ChartModel } from './model';
import type { Value } from '@hrd/core';

function cell(v: Value | undefined, format: (n: number) => string, period: string): string {
  if (!v) return '–';
  if (v.value === null) return v.kind === 'forecast' && period === 'future' ? 'No forecast' : '–';
  return v.kind === 'actual' ? format(v.value) : `${format(v.value)} (${KIND_LABEL[v.kind].toLowerCase()})`;
}

export function ChartTable({ model }: { model: ChartModel }) {
  const parts = model.groups.flatMap((g) => g.parts);
  return (
    <div className="table-scroll">
      <table className="table table--dense hrd-stack-table">
        <caption className="visually-hidden">{model.title}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {parts.map((p) => (
              <th key={p.key} scope="col" className="num">
                {p.label}
              </th>
            ))}
            {model.line && (
              <th scope="col" className="num">
                {model.line.label}
              </th>
            )}
            {model.extra && (
              <th scope="col" className="num">
                {model.extra.label}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {model.months.map((m) => (
            <tr key={m.month} className={m.isSelected ? 'is-active' : undefined}>
              <th scope="row" className="table-name" data-label="Month">
                {formatMonth(m.month)}
                {m.isCurrent ? ' (to date)' : ''}
                {m.isSelected && !m.isCurrent ? ' (selected)' : ''}
              </th>
              {parts.map((p) => (
                <td key={p.key} className="num" data-label={p.label}>
                  {cell(m.values[p.key], model.format, m.period)}
                </td>
              ))}
              {model.line && (
                <td className="num" data-label={model.line.label}>
                  {cell(m.values[model.line.key], model.line.format, m.period)}
                </td>
              )}
              {model.extra && (
                <td className="num" data-label={model.extra.label}>
                  {cell(m.extra, model.extra.format ?? formatNumber, m.period)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
