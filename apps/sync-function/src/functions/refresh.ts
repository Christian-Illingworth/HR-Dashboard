// POST /api/refresh: authorized in code, then queues a sync on the same queue as the timer.

import { app } from '@azure/functions';
import { tenantKeys } from '../auth/checkRequest';
import { compose } from '../composition';
import { loadConfig } from '../config';
import { handleRefresh } from '../http/refresh';
import { syncQueue } from './sync';

app.http('refresh', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'refresh',
  extraOutputs: [syncQueue],
  handler: async (request, context) => {
    const config = loadConfig(process.env, { requireApi: true });
    const { store, now, log } = compose(config);
    const result = await handleRefresh(request, {
      auth: { tenantId: config.tenantId!, audiences: config.apiAudience!.split(',').map((a) => a.trim()), keys: tenantKeys(config.tenantId!) },
      store,
      now,
      log,
      enqueue: (message) => context.extraOutputs.set(syncQueue, message),
    });
    return { status: result.status, jsonBody: result.jsonBody, headers: result.headers };
  },
});
