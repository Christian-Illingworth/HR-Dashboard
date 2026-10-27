// The one chart all trend sections use: columns per month (grouped, each group stacked), an
// optional line on its own scale, and an optional figure under each month.
// Accessibility (Principle IV, FR-017): every month is a focusable point with a full text label;
// arrow keys move between months; hover, tap or focus shows the tooltip with exact values.
// Forecasts are hatched with a dashed edge and bracketed "Forecast" (FR-015, Principle V).

import { useRef, useState, type KeyboardEvent } from 'react';
import { formatMonthLong, formatMonthShort, formatNumber } from '../format';
import { KIND_LABEL, groupTotal, niceScale, styleOf, type ChartModel, type ChartMonth } from './model';
import { PartPatterns, patternId } from './patterns';
import { useElementWidth } from './useElementWidth';

let nextUid = 0;

const TOP = 22;
const PLOT_H = 150;

/** Text lines describing one month: used for the tooltip and the point's accessible name. */
export function describeMonth(model: ChartModel, m: ChartMonth): string[] {
  const lines: string[] = [];
  for (const g of model.groups) {
    for (const p of g.parts) {
      const v = m.values[p.key];
      if (!v) continue;
      if (v.value === null) {
        if (v.kind === 'forecast') lines.push(`${p.label}: no forecast (not enough history)`);
        continue;
      }
      lines.push(`${p.label}: ${model.format(v.value)} (${KIND_LABEL[v.kind].toLowerCase()})`);
    }
  }
  if (model.line) {
    const v = m.values[model.line.key];
    if (v && v.value !== null) lines.push(`${model.line.label}: ${model.line.format(v.value)} (${KIND_LABEL[v.kind].toLowerCase()})`);
  }
  if (model.extra && m.extra && m.extra.value !== null) {
    lines.push(`${model.extra.label}: ${(model.extra.format ?? formatNumber)(m.extra.value)} (${KIND_LABEL[m.extra.kind].toLowerCase()})`);
  }
  if (m.coverage !== 'full' && model.coverageNote) lines.push(model.coverageNote);
  return lines;
}

/** The non-actual kinds in a month, for the bracket under the axis ("Forecast", "Booked"). */
function bracketLabel(model: ChartModel, m: ChartMonth): string | null {
  if (m.period !== 'future') return null;
  const kinds = new Set<string>();
  for (const v of Object.values(m.values)) if (v.kind !== 'actual' && v.kind !== 'toDate') kinds.add(KIND_LABEL[v.kind]);
  if (m.extra && m.extra.kind === 'forecast') kinds.add(KIND_LABEL.forecast);
  if (kinds.size === 0) return null;
  const order = ['Known', 'Booked', 'Forecast'];
  const list = [...kinds].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return list.length === 1 ? list[0]! : `${list.slice(0, -1).join(', ')} and ${list.at(-1)!.toLowerCase()}`;
}

export function BarChart({ model }: { model: ChartModel }) {
  const uid = useRef(`hrdc${nextUid++}`).current;
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const months = model.months;
  const selectedIndex = Math.max(0, months.findIndex((m) => m.isSelected));
  const [focusIndex, setFocusIndex] = useState(selectedIndex);
  const [active, setActive] = useState<number | null>(null);
  const pointRefs = useRef<(SVGGElement | null)[]>([]);

  const hasLine = !!model.line;
  // On narrow charts the "Episodes" label sits on its own line, so the months keep their room.
  const compact = width < 480;
  const left = model.extra && !compact ? 64 : 34;
  const right = hasLine ? 42 : 10;
  const plotW = Math.max(120, width - left - right);
  const band = plotW / months.length;
  const plotBottom = TOP + PLOT_H;
  const labelY = plotBottom + 16;
  const subY = plotBottom + 30;
  const extraLabelY = plotBottom + 46;
  const extraY = compact ? plotBottom + 60 : plotBottom + 46;
  const bracketY = model.extra ? extraY + 18 : plotBottom + 48;
  const height = bracketY + 18;

  const maxBar = Math.max(0, ...months.flatMap((m) => model.groups.map((g) => groupTotal(m, g) ?? 0)));
  const yScale = niceScale(maxBar);
  const y = (v: number) => plotBottom - (v / yScale.top) * PLOT_H;
  const lineScale = model.line
    ? niceScale(Math.max(0, ...months.map((m) => m.values[model.line!.key]?.value ?? 0)))
    : null;
  const yLine = (v: number) => plotBottom - (v / lineScale!.top) * PLOT_H;

  const groupGap = 4;
  const columnsW = band * 0.62;
  const colW = (columnsW - groupGap * (model.groups.length - 1)) / model.groups.length;

  const move = (to: number) => {
    const i = Math.max(0, Math.min(months.length - 1, to));
    setFocusIndex(i);
    setActive(i);
    pointRefs.current[i]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => move(focusIndex + 1),
      ArrowLeft: () => move(focusIndex - 1),
      Home: () => move(0),
      End: () => move(months.length - 1),
      Escape: () => setActive(null),
    };
    const run = keys[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  };

  // Brackets: runs of adjacent months with the same non-actual label.
  const brackets: { from: number; to: number; label: string }[] = [];
  months.forEach((m, i) => {
    const label = bracketLabel(model, m);
    const last = brackets.at(-1);
    if (label && last && last.label === label && last.to === i - 1) last.to = i;
    else if (label) brackets.push({ from: i, to: i, label });
  });

  const tooltipMonth = active === null ? null : months[active];
  const tooltipX = active === null ? 0 : left + band * (active + 0.5);

  return (
    <div className="hrd-chart" ref={ref} onMouseLeave={() => setActive(null)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={`${model.title}. Use the arrow keys to move between months.`}
        onKeyDown={onKeyDown}
      >
        {model.groups.flatMap((g) => g.parts).map((p) => (
          <PartPatterns key={p.key} uid={uid} part={p} />
        ))}

        {/* Selected-month band, behind everything */}
        <rect className="hrd-band" x={left + band * selectedIndex} y={TOP - 6} width={band} height={PLOT_H + 6} rx="6" />

        {/* Gridlines and value axis */}
        {yScale.ticks.map((t) => (
          <g key={`y${t}`}>
            <line className="hrd-gridline" x1={left} x2={left + plotW} y1={y(t)} y2={y(t)} />
            <text className="hrd-axis-tick" x={left - 6} y={y(t) + 4} textAnchor="end">
              {formatNumber(t)}
            </text>
          </g>
        ))}
        {lineScale?.ticks.map((t) => (
          <text key={`l${t}`} className="hrd-axis-tick" x={left + plotW + 6} y={yLine(t) + 4} textAnchor="start">
            {model.line!.format(t)}
          </text>
        ))}

        {months.map((m, i) => {
          const x0 = left + band * i + (band - columnsW) / 2;
          const description = describeMonth(model, m);
          return (
            <g
              key={m.month}
              ref={(el) => {
                pointRefs.current[i] = el;
              }}
              className="hrd-point"
              tabIndex={i === focusIndex ? 0 : -1}
              role="img"
              aria-label={`${formatMonthLong(m.month)}${m.isCurrent ? ', to date' : ''}. ${description.join('. ')}`}
              onFocus={() => {
                setFocusIndex(i);
                setActive(i);
              }}
              onBlur={() => setActive(null)}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
            >
              <rect className="hrd-hit" x={left + band * i + 1} y={TOP - 6} width={band - 2} height={PLOT_H + 6} rx="6" />
              {model.groups.map((g, gi) => {
                let base = 0;
                const gx = x0 + gi * (colW + groupGap);
                const total = groupTotal(m, g);
                return (
                  <g key={g.key}>
                    {g.parts.map((p) => {
                      const v = m.values[p.key];
                      if (!v || v.value === null || v.value <= 0) return null;
                      const y1 = y(base + v.value);
                      const h = y(base) - y1;
                      base += v.value;
                      const style = styleOf(v.kind);
                      return (
                        <g key={p.key} className={p.tone}>
                          <rect
                            className={`hrd-bar hrd-bar--${style}`}
                            x={gx}
                            y={y1}
                            width={Math.max(2, colW)}
                            height={Math.max(1, h)}
                            fill={`url(#${patternId(uid, p, style)})`}
                          />
                        </g>
                      );
                    })}
                    {total !== null && (
                      <text className="hrd-value-label" x={gx + colW / 2} y={y(total) - 5} textAnchor="middle">
                        {formatNumber(total)}
                      </text>
                    )}
                  </g>
                );
              })}
              <text className={`hrd-axis-label${m.isSelected ? ' is-selected' : ''}`} x={left + band * (i + 0.5)} y={labelY} textAnchor="middle">
                {formatMonthShort(m.month)}
              </text>
              {m.isCurrent && (
                <text className="hrd-axis-sub" x={left + band * (i + 0.5)} y={subY} textAnchor="middle">
                  to date
                </text>
              )}
              {model.extra && m.extra && m.extra.value !== null && (
                <text className="hrd-axis-extra" x={left + band * (i + 0.5)} y={extraY} textAnchor="middle">
                  {formatNumber(m.extra.value)}
                </text>
              )}
            </g>
          );
        })}

        {model.extra && (
          <text
            className="hrd-axis-sub"
            x={compact ? left : left - 6}
            y={extraLabelY}
            textAnchor={compact ? 'start' : 'end'}
          >
            {model.extra.short}
          </text>
        )}

        {/* The line (e.g. attrition rate) with dot markers, on its own right-hand scale */}
        {model.line && (
          <g className={model.line.tone}>
            <path
              className="hrd-line"
              d={months
                .map((m, i) => ({ v: m.values[model.line!.key]?.value ?? null, i }))
                .filter((p) => p.v !== null)
                .map((p, j) => `${j === 0 ? 'M' : 'L'}${left + band * (p.i + 0.5)},${yLine(p.v!)}`)
                .join(' ')}
            />
            {months.map((m, i) => {
              const v = m.values[model.line!.key]?.value ?? null;
              return v === null ? null : (
                <circle key={m.month} className="hrd-marker" cx={left + band * (i + 0.5)} cy={yLine(v)} r="4" />
              );
            })}
          </g>
        )}

        {/* Brackets naming non-actual months: "Forecast", "Booked" (not colour alone, FR-015) */}
        {brackets.map((b) => {
          const x1 = left + band * b.from + 4;
          const x2 = left + band * (b.to + 1) - 4;
          return (
            <g key={`${b.from}-${b.label}`} className="hrd-bracket">
              <path d={`M${x1},${bracketY - 10} V${bracketY - 6} H${x2} V${bracketY - 10}`} />
              <text className="hrd-axis-sub" x={(x1 + x2) / 2} y={bracketY + 7} textAnchor="middle">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>

      {tooltipMonth && (
        <div
          className="hrd-tooltip"
          role="presentation"
          style={{ left: Math.min(Math.max(tooltipX, 90), width - 90), top: 0 }}
        >
          <strong>
            {formatMonthLong(tooltipMonth.month)}
            {tooltipMonth.isCurrent ? ' (to date)' : ''}
          </strong>
          {describeMonth(model, tooltipMonth).map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}
    </div>
  );
}
