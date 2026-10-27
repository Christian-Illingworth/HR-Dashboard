// Metric: docs/metric-catalogue.md#d8

/** D8. 1 decimal place, half away from zero. Used only when building the response. */
export function round1(x: number): number;
export function round1(x: number | null): number | null;
export function round1(x: number | null): number | null {
  if (x === null) return null;
  const r = (Math.sign(x) * Math.round(Math.abs(x) * 10 + Number.EPSILON)) / 10;
  return Object.is(r, -0) ? 0 : r;
}
