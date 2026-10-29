import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DirectoryUser } from '@hrd/core';
import type { DirectoryClient } from './DirectoryClient';

/** Serves the synthetic fixtures/entra/users.json in place of Microsoft Graph. */
export class MockDirectoryClient implements DirectoryClient {
  constructor(private readonly opts: { fixturesDir: string }) {}

  async listUsers(): Promise<DirectoryUser[]> {
    return JSON.parse(readFileSync(join(this.opts.fixturesDir, 'entra', 'users.json'), 'utf8')) as DirectoryUser[];
  }
}
