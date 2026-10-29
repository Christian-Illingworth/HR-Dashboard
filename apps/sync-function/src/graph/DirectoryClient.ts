// Departments come from Entra ID (research R10). Two implementations: MockDirectoryClient
// (fixtures) and GraphDirectoryClient (Milestone 3, needs User.Read.All).

import type { DirectoryUser } from '@hrd/core';

export interface DirectoryClient {
  listUsers(): Promise<DirectoryUser[]>;
}
