// An in-memory stand-in for the Microsoft Graph SharePoint list endpoints SharePointStore uses.
// No network: tests pass `fetch` into the store.
import { LIST_COLUMNS, LIST_NAMES } from '../../src/store/sharepointStore';

interface Item {
  id: string;
  etag: number;
  fields: Record<string, unknown>;
}

export class FakeGraph {
  lists = new Map<string, { id: string; displayName: string; columns: string[]; items: Item[] }>();
  batchCalls: number[] = [];
  requests: { method: string; url: string; auth: string | null }[] = [];
  failNextBatchWith429 = 0;
  private nextId = 1;
  pageSize = 2;

  constructor(opts: { missingColumn?: string } = {}) {
    for (const [key, name] of Object.entries(LIST_NAMES)) {
      const columns = ['Title', ...LIST_COLUMNS[key as keyof typeof LIST_COLUMNS]].filter((c) => c !== opts.missingColumn);
      this.lists.set(name, { id: `list-${key}`, displayName: name, columns, items: [] });
    }
  }

  list(key: keyof typeof LIST_NAMES) {
    return this.lists.get(LIST_NAMES[key])!;
  }
  seed(key: keyof typeof LIST_NAMES, fields: Record<string, unknown>) {
    this.list(key).items.push({ id: String(this.nextId++), etag: 1, fields });
  }
  private byId(id: string) {
    return [...this.lists.values()].find((l) => l.id === id)!;
  }

  fetch = async (input: string | URL | Request, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init.method ?? 'GET';
    this.requests.push({ method, url: url.pathname + url.search, auth: new Headers(init.headers).get('authorization') });
    if (url.pathname.endsWith('/$batch')) return this.batch(JSON.parse(String(init.body)));
    return this.handle(method, url.pathname.replace('/v1.0', ''), url.searchParams, init);
  };

  private json(status: number, body: unknown, headers: Record<string, string> = {}) {
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
  }

  private handle(method: string, path: string, params: URLSearchParams, init: RequestInit): Response {
    let m = /^\/sites\/[^/]+\/lists$/.exec(path);
    if (m) return this.json(200, { value: [...this.lists.values()].map((l) => ({ id: l.id, displayName: l.displayName })) });
    m = /^\/sites\/[^/]+\/lists\/([^/]+)\/columns$/.exec(path);
    if (m) return this.json(200, { value: this.byId(m[1]!).columns.map((name) => ({ name })) });
    m = /^\/sites\/[^/]+\/lists\/([^/]+)\/items$/.exec(path);
    if (m && method === 'GET') {
      const items = this.byId(m[1]!).items;
      const skip = Number(params.get('skip') ?? 0);
      const page = items.slice(skip, skip + this.pageSize);
      const next = skip + this.pageSize < items.length ? `https://graph.microsoft.com/v1.0${path}?skip=${skip + this.pageSize}` : undefined;
      return this.json(200, {
        value: page.map((i) => ({ id: i.id, '@odata.etag': `"${i.etag}"`, fields: i.fields })),
        ...(next ? { '@odata.nextLink': next } : {}),
      });
    }
    m = /^\/sites\/[^/]+\/lists\/([^/]+)\/items$/.exec(path);
    if (m && method === 'POST') {
      const item = { id: String(this.nextId++), etag: 1, fields: (JSON.parse(String(init.body)) as { fields: Record<string, unknown> }).fields };
      this.byId(m[1]!).items.push(item);
      return this.json(201, { id: item.id });
    }
    m = /^\/sites\/[^/]+\/lists\/([^/]+)\/items\/([^/]+)(\/fields)?$/.exec(path);
    if (m) {
      const list = this.byId(m[1]!);
      const item = list.items.find((i) => i.id === m![2]);
      if (!item) return this.json(404, {});
      if (method === 'GET') return this.json(200, { id: item.id, '@odata.etag': `"${item.etag}"`, fields: item.fields });
      if (method === 'DELETE') {
        list.items = list.items.filter((i) => i !== item);
        return this.json(204, null);
      }
      if (method === 'PATCH') {
        const ifMatch = new Headers(init.headers).get('if-match');
        if (ifMatch && ifMatch !== `"${item.etag}"`) return this.json(412, {});
        Object.assign(item.fields, JSON.parse(String(init.body)));
        item.etag++;
        return this.json(200, item.fields);
      }
    }
    return this.json(404, { path });
  }

  private batch(body: { requests: { id: string; method: string; url: string; body?: unknown; headers?: Record<string, string> }[] }): Response {
    this.batchCalls.push(body.requests.length);
    const responses = body.requests.map((r) => {
      if (this.failNextBatchWith429 > 0) {
        this.failNextBatchWith429--;
        return { id: r.id, status: 429, headers: { 'Retry-After': '0' } };
      }
      const res = this.handle(r.method, r.url.split('?')[0]!, new URLSearchParams(), { method: r.method, body: r.body ? JSON.stringify(r.body) : undefined, headers: r.headers });
      return { id: r.id, status: res.status };
    });
    return this.json(200, { responses });
  }
}
