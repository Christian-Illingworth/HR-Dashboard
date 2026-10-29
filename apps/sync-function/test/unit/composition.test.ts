// T128: configuration alone picks mock or live clients, and the file or SharePoint store.
// Building the clients makes no network call; nothing here talks to BrightHR or Graph.
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compose } from '../../src/composition';
import { loadConfig } from '../../src/config';
import { LiveBrightHrClient } from '../../src/brighthr/liveClient';
import { MockBrightHrClient } from '../../src/brighthr/mockClient';
import { GraphDirectoryClient } from '../../src/graph/graphDirectory';
import { MockDirectoryClient } from '../../src/graph/mockDirectory';
import { FileStore } from '../../src/store/fileStore';
import { SharePointStore } from '../../src/store/sharepointStore';

const FIXTURES_DIR = resolve(__dirname, '../../../../fixtures');

describe('compose', () => {
  it('uses the mocks and the file store by default', () => {
    const s = compose(loadConfig({ FIXTURES_DIR }));
    expect(s.brightHr).toBeInstanceOf(MockBrightHrClient);
    expect(s.directory).toBeInstanceOf(MockDirectoryClient);
    expect(s.store).toBeInstanceOf(FileStore);
  });

  it('uses the live clients when BRIGHTHR_MODE is live, and the SharePoint store when asked', () => {
    const s = compose(
      loadConfig({ BRIGHTHR_MODE: 'live', BRIGHTHR_CLIENT_ID: 'id', BRIGHTHR_CLIENT_SECRET: 'value', STORE_MODE: 'sharepoint', DATA_SITE_ID: 'host:/sites/data:' }),
    );
    expect(s.brightHr).toBeInstanceOf(LiveBrightHrClient);
    expect(s.directory).toBeInstanceOf(GraphDirectoryClient);
    expect(s.store).toBeInstanceOf(SharePointStore);
  });

  it('refuses to start in live mode without credentials', () => {
    expect(() => compose(loadConfig({ BRIGHTHR_MODE: 'live' }))).toThrow();
  });
});
