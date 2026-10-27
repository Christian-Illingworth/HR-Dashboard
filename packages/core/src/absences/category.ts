// Metric: docs/metric-catalogue.md#d5

import type { AbsenceCategory, AbsenceTypeMapping } from '../records/types';

const DEFAULTS: Record<string, AbsenceCategory> = {
  Holiday: 'annualLeave',
  Toil: 'other',
  Other: 'other',
};

/**
 * D5. `Sickness` is always sickness. Otherwise the first `AbsenceTypeMap` line whose display
 * name matches (ignoring case) decides; failing that, the default for the `$type`, and
 * `other` for a `$type` we don't know.
 */
export function categorise(
  brightHrType: string,
  displayName: string,
  map: readonly AbsenceTypeMapping[],
): AbsenceCategory {
  if (brightHrType === 'Sickness') return 'sickness';
  const name = displayName.trim().toLowerCase();
  const match = map.find((m) => m.displayName.trim().toLowerCase() === name);
  if (match) return match.category;
  return DEFAULTS[brightHrType] ?? 'other';
}
