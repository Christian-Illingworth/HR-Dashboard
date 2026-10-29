// Length of service and work anniversaries (feature 002): M17 and M18. Relative to today only,
// never the picked month (spec 002 FR-012).

import { anniversaries } from '../../metrics/anniversaries';
import { lengthOfService } from '../../metrics/lengthOfService';
import type { DashboardContext } from '../context';
import { round1 } from '../round';
import type { Section, ServiceData } from '../types';

export function buildService(ctx: DashboardContext): Section<ServiceData> {
  const los = lengthOfService(ctx);
  if (los === null) return { status: 'empty', message: 'No staff in this group' };
  // Names for non-Sales staff are only stored while AnniversaryNames is on (002 FR-014), so the
  // list is switched off rather than shown without them.
  const { from, to, entries } = anniversaries(ctx);
  const enabled = ctx.settings.anniversaryNames;
  return {
    status: 'ok',
    data: {
      averageYears: round1(los.averageYears),
      medianYears: round1(los.medianYears),
      firstYear: los.firstYear,
      bands: los.bands,
      anniversaries: { enabled, from, to, entries: enabled ? entries : [] },
    },
  };
}
