// GET /api/dashboard. authLevel is "anonymous" because every request is authorized in code with
// the caller's Entra ID token and app role (research R4); there are no function keys to leak.

import { app } from '@azure/functions';
import { tenantKeys } from '../auth/checkRequest';
import { compose } from '../composition';
import { loadConfig } from '../config';
import { handleDashboard, RecordsCache, type DashboardDeps } from '../http/dashboard';

const cache = new RecordsCache();
let deps: DashboardDeps | null = null;

function dashboardDeps(): DashboardDeps {
  if (!deps) {
    const config = loadConfig(process.env, { requireApi: true });
    const { store, now, log } = compose(config);
    deps = {
      auth: { tenantId: config.tenantId!, audiences: config.apiAudience!.split(',').map((a) => a.trim()), keys: tenantKeys(config.tenantId!) },
      store,
      now,
      syncIntervalHours: config.syncIntervalHours,
      log,
      cache,
    };
  }
  return deps;
}

app.http('dashboard', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'dashboard',
  handler: async (request) => {
    const result = await handleDashboard(request, dashboardDeps());
    return { status: result.status, jsonBody: result.jsonBody, headers: result.headers };
  },
});
