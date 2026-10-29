// The sync triggers (research R7). The hourly timer decides in UK time whether this is a sync
// hour and, if so, queues a request; the queue trigger runs one sync at a time (host.json
// batchSize 1) behind the status lock. POST /api/refresh queues on the same queue.

import { app, output } from '@azure/functions';
import { shouldSync } from '@hrd/core';
import { compose } from '../composition';
import { loadConfig } from '../config';
import { runSync } from '../sync/runSync';

export const syncQueue = output.storageQueue({ queueName: 'sync-requests', connection: 'AzureWebJobsStorage' });

app.timer('syncSchedule', {
  schedule: '0 0 * * * *',
  extraOutputs: [syncQueue],
  handler: async (_timer, context) => {
    const config = loadConfig();
    const { log } = compose(config);
    const now = new Date().toISOString();
    if (shouldSync(now, config.syncIntervalHours)) {
      context.extraOutputs.set(syncQueue, { requestedAt: now, by: 'schedule' });
      log.info('sync.scheduled');
    } else {
      log.info('sync.notScheduled');
    }
  },
});

app.storageQueue('syncRun', {
  queueName: 'sync-requests',
  connection: 'AzureWebJobsStorage',
  handler: async () => {
    const config = loadConfig();
    const services = compose(config);
    await runSync({ ...services, brightHrMode: config.brightHrMode });
  },
});
