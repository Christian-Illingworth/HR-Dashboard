// SVG patterns for chart parts. Each pattern sits inside a <g> with the part's tone class, so its
// strokes and fills resolve var(--c) / var(--c-bg) to that series' colour: no colours here.

import type { ChartPart, Motif } from './model';

export const patternId = (uid: string, part: ChartPart, variant: 'actual' | 'booked' | 'known' | 'forecast') =>
  `${uid}-${part.key}-${variant}`;

function MotifMarks({ motif, cls }: { motif: Motif; cls: string }) {
  switch (motif) {
    case 'diagonal':
      return <path className={cls} d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" />;
    case 'dots':
      return <circle className={cls} cx="4" cy="4" r="1.3" />;
    case 'lines':
      return <path className={cls} d="M0,2 H8 M0,6 H8" />;
    default:
      return null;
  }
}

/** Definitions for one part: actual (colour + white motif), booked/known (tint + colour motif), forecast (hatch). */
export function PartPatterns({ uid, part }: { uid: string; part: ChartPart }) {
  return (
    <g className={part.tone}>
      <defs>
        <pattern id={patternId(uid, part, 'actual')} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect className="hrd-pat-fill" width="8" height="8" />
          <MotifMarks motif={part.motif} cls="hrd-pat-mark-light" />
        </pattern>
        <pattern id={patternId(uid, part, 'booked')} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect className="hrd-pat-tint" width="8" height="8" />
          <MotifMarks motif={part.motif} cls="hrd-pat-mark" />
        </pattern>
        <pattern id={patternId(uid, part, 'known')} width="6" height="6" patternUnits="userSpaceOnUse">
          <rect className="hrd-pat-tint" width="6" height="6" />
          <circle className="hrd-pat-mark" cx="3" cy="3" r="1.4" />
        </pattern>
        <pattern id={patternId(uid, part, 'forecast')} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect className="hrd-pat-paper" width="6" height="6" />
          <line className="hrd-pat-hatch" x1="0" y1="0" x2="0" y2="6" />
        </pattern>
      </defs>
    </g>
  );
}

/** A small swatch for legends, drawn with the same patterns as the bars. */
export function Swatch({ uid, part, variant }: { uid: string; part: ChartPart; variant: 'actual' | 'booked' | 'known' | 'forecast' }) {
  return (
    <svg className="hrd-swatch" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <PartPatterns uid={`${uid}-sw`} part={part} />
      <g className={part.tone}>
        <rect
          className={`hrd-bar hrd-bar--${variant}`}
          x="0.5"
          y="0.5"
          width="13"
          height="13"
          rx="2"
          fill={`url(#${patternId(`${uid}-sw`, part, variant)})`}
        />
      </g>
    </svg>
  );
}
