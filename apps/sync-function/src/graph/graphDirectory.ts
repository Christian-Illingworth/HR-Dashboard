// Departments from Entra ID through Microsoft Graph (research R10). Needs the managed identity's
// User.Read.All application permission, which a human grants at go-live (research P5).
// Only mail, userPrincipalName and department are requested.

import type { TokenCredential } from '@azure/identity';
import type { DirectoryUser } from '@hrd/core';
import { StoreError } from '../store/Store';
import type { DirectoryClient } from './DirectoryClient';

export class GraphDirectoryClient implements DirectoryClient {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly opts: { credential: TokenCredential; fetch?: typeof fetch }) {
    this.fetchFn = opts.fetch ?? fetch;
  }

  async listUsers(): Promise<DirectoryUser[]> {
    const users: DirectoryUser[] = [];
    let url: string | undefined = 'https://graph.microsoft.com/v1.0/users?$select=mail,userPrincipalName,department&$top=999';
    while (url) {
      const token = await this.opts.credential.getToken('https://graph.microsoft.com/.default');
      const res = await this.fetchFn(url, { headers: { Authorization: `Bearer ${token?.token ?? ''}` } });
      if (!res.ok) throw new StoreError('GRAPH_READ');
      const page = (await res.json()) as { value: DirectoryUser[]; '@odata.nextLink'?: string };
      users.push(...page.value.map((u) => ({ mail: u.mail ?? null, userPrincipalName: u.userPrincipalName ?? null, department: u.department ?? null })));
      url = page['@odata.nextLink'];
    }
    return users;
  }
}
