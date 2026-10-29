// Picks the BrightHR client, the directory and the store from configuration (research R14).
// Mock and file are the defaults; switching to live data is a configuration change only, made by
// a human at go-live (docs/runbooks/go-live.md).

import { ManagedIdentityCredential } from '@azure/identity';
import type { BrightHrClient } from './brighthr/BrightHrClient';
import { LiveBrightHrClient } from './brighthr/liveClient';
import { MockBrightHrClient } from './brighthr/mockClient';
import type { Config } from './config';
import type { DirectoryClient } from './graph/DirectoryClient';
import { GraphDirectoryClient } from './graph/graphDirectory';
import { MockDirectoryClient } from './graph/mockDirectory';
import { createLogger, type Logger } from './log';
import { FileStore } from './store/fileStore';
import { SharePointStore } from './store/sharepointStore';
import type { Store } from './store/Store';

export interface Services {
  brightHr: BrightHrClient;
  directory: DirectoryClient;
  store: Store;
  now: () => string;
  log: Logger;
}

const systemNow = () => new Date().toISOString();

export function compose(config: Config, now: () => string = systemNow): Services {
  const credential = config.brightHrMode === 'live' || config.storeMode === 'sharepoint' ? new ManagedIdentityCredential() : null;
  const live = config.brightHrMode === 'live';
  if (live && !config.brightHr) throw new Error('BRIGHTHR_MODE is live but the BrightHR credentials are not set.');
  return {
    brightHr: live ? new LiveBrightHrClient(config.brightHr!) : new MockBrightHrClient({ fixturesDir: config.fixturesDir, now }),
    directory: live ? new GraphDirectoryClient({ credential: credential! }) : new MockDirectoryClient({ fixturesDir: config.fixturesDir }),
    store:
      config.storeMode === 'sharepoint'
        ? new SharePointStore({ siteId: config.dataSiteId!, credential: credential! })
        : new FileStore(config.localDataDir),
    now,
    log: createLogger(),
  };
}
