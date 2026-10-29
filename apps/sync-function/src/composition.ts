// Picks the BrightHR client, the directory and the store from configuration (research R14).
// Mock and file are the defaults; switching to live data is a configuration change only.

import { ManagedIdentityCredential } from '@azure/identity';
import type { BrightHrClient } from './brighthr/BrightHrClient';
import { MockBrightHrClient } from './brighthr/mockClient';
import type { Config } from './config';
import type { DirectoryClient } from './graph/DirectoryClient';
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
  if (config.brightHrMode === 'live') {
    // Tasks T126–T128 (Milestone 3) add LiveBrightHrClient and GraphDirectoryClient here.
    throw new Error('Live BrightHR data is not available until Milestone 3.');
  }
  const store =
    config.storeMode === 'sharepoint'
      ? new SharePointStore({ siteId: config.dataSiteId!, credential: new ManagedIdentityCredential() })
      : new FileStore(config.localDataDir);
  return {
    brightHr: new MockBrightHrClient({ fixturesDir: config.fixturesDir, now }),
    directory: new MockDirectoryClient({ fixturesDir: config.fixturesDir }),
    store,
    now,
    log: createLogger(),
  };
}
