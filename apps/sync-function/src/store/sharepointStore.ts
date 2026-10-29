// SharePointStore: the lists in the "HR Dashboard Data" site, through Microsoft Graph with the
// Function's managed identity and Sites.Selected (research R6, contracts/sharepoint-lists.md).
// Reads are paged; writes go in JSON batches of at most 20 and skip unchanged items. It never
// creates or changes lists: scripts/provision-lists.ps1 does that, run by a human.

import type { TokenCredential } from '@azure/identity';
import type {
  AbsenceRecord,
  BoundaryPart,
  DashboardRecords,
  EmployeeHistoryRow,
  EmployeeRecord,
  RawSettings,
  SicknessReasonRecord,
  SyncStatus,
} from '@hrd/core';
import {
  contentHash,
  initialStatus,
  keyOf,
  PreconditionFailed,
  StoreError,
  type ChangeCounts,
  type Changes,
  type Store,
} from './Store';

const GRAPH = 'https://graph.microsoft.com/v1.0';

export const LIST_NAMES = {
  employees: 'HRD Employees',
  history: 'HRD Employee History',
  absences: 'HRD Absences',
  reasons: 'HRD Sickness Reasons',
  status: 'HRD Sync Status',
  settings: 'HRD Settings',
} as const;
type ListKey = keyof typeof LIST_NAMES;

/** Columns besides Title, by list (contracts/sharepoint-lists.md). */
export const LIST_COLUMNS: Record<ListKey, string[]> = {
  employees: ['StartDate', 'EndDate', 'JobTitle', 'Department', 'GivenName', 'FamilyName', 'ContentHash'],
  history: ['EmployeeId', 'Month', 'Department', 'JobTitle'],
  absences: [
    'EmployeeId', 'BrightHrType', 'DisplayName', 'StartDate', 'StartPart', 'EndDate', 'EndPart',
    'DurationDays', 'DurationMinutes', 'PregnancyRelated', 'ContentHash',
  ],
  reasons: ['Reason'],
  status: [
    'LastAttemptStartedAt', 'LastAttemptFinishedAt', 'LastSuccessAt', 'RunningSince', 'LastManualRefreshAt',
    'LastAttemptOutcome', 'LastFailureCode', 'DataMode', 'HistoryStartDate', 'Warnings',
  ],
  settings: ['Value'],
};

type Fields = Record<string, unknown>;
const str = (v: unknown): string | null => (v === undefined || v === null || v === '' ? null : String(v));
const date = (v: unknown): string | null => str(v)?.slice(0, 10) ?? null;
const num = (v: unknown): number | null => (v === undefined || v === null || v === '' ? null : Number(v));

const mappers = {
  employees: {
    to: (e: EmployeeRecord): Fields => ({
      Title: e.employeeId, StartDate: e.startDate, EndDate: e.endDate, JobTitle: e.jobTitle, Department: e.department,
      GivenName: e.givenName, FamilyName: e.familyName, ContentHash: contentHash(e),
    }),
    from: (f: Fields): EmployeeRecord => ({
      employeeId: String(f.Title), startDate: date(f.StartDate)!, endDate: date(f.EndDate), jobTitle: str(f.JobTitle) ?? 'Not set',
      department: str(f.Department) ?? 'Not set', givenName: str(f.GivenName), familyName: str(f.FamilyName),
    }),
  },
  history: {
    to: (h: EmployeeHistoryRow): Fields => ({ Title: keyOf.history(h), EmployeeId: h.employeeId, Month: h.month, Department: h.department, JobTitle: h.jobTitle }),
    from: (f: Fields): EmployeeHistoryRow => ({
      employeeId: String(f.EmployeeId), month: String(f.Month), department: str(f.Department) ?? 'Not set', jobTitle: str(f.JobTitle) ?? 'Not set',
    }),
  },
  absences: {
    to: (a: AbsenceRecord): Fields => ({
      Title: a.absenceId, EmployeeId: a.employeeId, BrightHrType: a.brightHrType, DisplayName: a.displayName, StartDate: a.startDate,
      StartPart: a.startPart, EndDate: a.endDate, EndPart: a.endPart, DurationDays: a.durationDays, DurationMinutes: a.durationMinutes,
      PregnancyRelated: a.pregnancyRelated, ContentHash: contentHash(a),
    }),
    from: (f: Fields): AbsenceRecord => ({
      absenceId: String(f.Title), employeeId: String(f.EmployeeId), brightHrType: String(f.BrightHrType), displayName: String(f.DisplayName ?? ''),
      startDate: date(f.StartDate)!, startPart: (str(f.StartPart) ?? 'FullDay') as BoundaryPart, endDate: date(f.EndDate),
      endPart: str(f.EndPart) as BoundaryPart | null, durationDays: num(f.DurationDays), durationMinutes: num(f.DurationMinutes),
      pregnancyRelated: f.PregnancyRelated === true,
    }),
  },
  reasons: {
    to: (r: SicknessReasonRecord): Fields => ({ Title: r.absenceId, Reason: r.reason }),
    from: (f: Fields): SicknessReasonRecord => ({ absenceId: String(f.Title), reason: String(f.Reason ?? '') }),
  },
};

interface ListItem {
  id: string;
  etag: string;
  fields: Fields;
}

export interface SharePointStoreOptions {
  siteId: string;
  credential: TokenCredential;
  fetch?: typeof fetch;
  /** Pause before retrying a throttled request when Graph gives no Retry-After. */
  retryDelayMs?: number;
}

export class SharePointStore implements Store {
  private listIds: Record<string, string> | null = null;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly opts: SharePointStoreOptions) {
    this.fetchFn = opts.fetch ?? fetch;
  }

  private async call(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.opts.credential.getToken('https://graph.microsoft.com/.default');
    if (!token) throw new StoreError('GRAPH_READ');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token.token}`);
    if (init.body) headers.set('Content-Type', 'application/json');
    return this.fetchFn(url.startsWith('http') ? url : `${GRAPH}${url}`, { ...init, headers });
  }

  private async getJson<T>(url: string): Promise<T> {
    const res = await this.call(url);
    if (!res.ok) throw new StoreError('GRAPH_READ');
    return (await res.json()) as T;
  }

  private site(path = '') {
    return `/sites/${this.opts.siteId}${path}`;
  }

  private async ids(): Promise<Record<string, string>> {
    if (!this.listIds) {
      const lists = await this.getJson<{ value: { id: string; displayName: string }[] }>(this.site('/lists?$select=id,displayName'));
      this.listIds = Object.fromEntries(lists.value.map((l) => [l.displayName, l.id]));
    }
    return this.listIds;
  }

  private async listId(key: ListKey): Promise<string> {
    const id = (await this.ids())[LIST_NAMES[key]];
    if (!id) throw new StoreError('STORE_SCHEMA');
    return id;
  }

  private async items(key: ListKey): Promise<ListItem[]> {
    const id = await this.listId(key);
    const out: ListItem[] = [];
    let url: string | undefined = this.site(`/lists/${id}/items?expand=fields&$top=999`);
    while (url) {
      const page: { value: { id: string; '@odata.etag': string; fields: Fields }[]; '@odata.nextLink'?: string } = await this.getJson(url);
      out.push(...page.value.map((i) => ({ id: i.id, etag: i['@odata.etag'], fields: i.fields })));
      url = page['@odata.nextLink'];
    }
    return out;
  }

  async checkSchema(): Promise<void> {
    for (const key of Object.keys(LIST_NAMES) as ListKey[]) {
      const id = await this.listId(key);
      const cols = await this.getJson<{ value: { name: string }[] }>(this.site(`/lists/${id}/columns?$select=name`));
      const have = new Set(cols.value.map((c) => c.name));
      if (!['Title', ...LIST_COLUMNS[key]].every((c) => have.has(c))) throw new StoreError('STORE_SCHEMA');
    }
  }

  async readAll(): Promise<DashboardRecords> {
    const [employees, history, absences, reasons] = await Promise.all([
      this.items('employees'),
      this.items('history'),
      this.items('absences'),
      this.items('reasons'),
    ]);
    return {
      employees: employees.map((i) => mappers.employees.from(i.fields)),
      history: history.map((i) => mappers.history.from(i.fields)),
      absences: absences.map((i) => mappers.absences.from(i.fields)),
      reasons: reasons.map((i) => mappers.reasons.from(i.fields)),
    };
  }

  async applyChanges(changes: Changes): Promise<ChangeCounts> {
    const counts = { written: 0, deleted: 0, unchanged: 0 };
    const ops: { method: string; url: string; body?: unknown }[] = [];

    const plan = async <T>(key: 'employees' | 'history' | 'absences' | 'reasons', upsert: T[], deletes: string[], to: (t: T) => Fields, keyFn: (t: T) => string, from: (f: Fields) => T) => {
      const listId = await this.listId(key);
      const existing = new Map((await this.items(key)).map((i) => [String(i.fields.Title), i]));
      for (const k of deletes) {
        const item = existing.get(k);
        if (!item) continue;
        ops.push({ method: 'DELETE', url: this.site(`/lists/${listId}/items/${item.id}`) });
        existing.delete(k);
        counts.deleted++;
      }
      for (const t of upsert) {
        const fields = to(t);
        const item = existing.get(keyFn(t));
        if (item && contentHash(from(item.fields) as object) === contentHash(t as object)) {
          counts.unchanged++;
          continue;
        }
        counts.written++;
        if (item) ops.push({ method: 'PATCH', url: this.site(`/lists/${listId}/items/${item.id}/fields`), body: fields });
        else ops.push({ method: 'POST', url: this.site(`/lists/${listId}/items`), body: { fields } });
      }
      return existing;
    };

    if (changes.employees) await plan('employees', changes.employees.upsert, changes.employees.delete, mappers.employees.to, keyOf.employees, mappers.employees.from);
    if (changes.history) await plan('history', changes.history.upsert, changes.history.delete, mappers.history.to, keyOf.history, mappers.history.from);
    if (changes.absences) await plan('absences', changes.absences.upsert, changes.absences.delete, mappers.absences.to, keyOf.absences, mappers.absences.from);
    if (changes.reasons) {
      const keep = new Set(changes.reasons.replace.map(keyOf.reasons));
      const stale = (await this.items('reasons')).map((i) => String(i.fields.Title)).filter((k) => !keep.has(k));
      await plan('reasons', changes.reasons.replace, stale, mappers.reasons.to, keyOf.reasons, mappers.reasons.from);
    }

    for (let i = 0; i < ops.length; i += 20) await this.batch(ops.slice(i, i + 20));
    return counts;
  }

  private async batch(ops: { method: string; url: string; body?: unknown }[]) {
    let pending = ops.map((op, i) => ({ ...op, id: String(i + 1) }));
    for (let attempt = 0; attempt < 5 && pending.length > 0; attempt++) {
      const res = await this.call('/$batch', {
        method: 'POST',
        body: JSON.stringify({ requests: pending.map((op) => ({ id: op.id, method: op.method, url: op.url, ...(op.body ? { body: op.body, headers: { 'Content-Type': 'application/json' } } : {}) })) }),
      });
      if (!res.ok) throw new StoreError('GRAPH_WRITE');
      const { responses } = (await res.json()) as { responses: { id: string; status: number; headers?: Record<string, string> }[] };
      const throttled = responses.filter((r) => r.status === 429 || r.status === 503);
      if (responses.some((r) => r.status >= 400 && r.status !== 429 && r.status !== 503)) throw new StoreError('GRAPH_WRITE');
      if (throttled.length === 0) return;
      const wait = Math.max(...throttled.map((r) => Number(r.headers?.['Retry-After'] ?? 0) * 1000), this.opts.retryDelayMs ?? 2000);
      await new Promise((r) => setTimeout(r, wait));
      const retry = new Set(throttled.map((r) => r.id));
      pending = pending.filter((op) => retry.has(op.id));
    }
    if (pending.length > 0) throw new StoreError('GRAPH_WRITE');
  }

  private async statusItem(): Promise<ListItem> {
    const item = (await this.items('status'))[0];
    if (!item) throw new StoreError('STORE_SCHEMA');
    return item;
  }

  async getStatus(): Promise<{ status: SyncStatus; etag: string }> {
    const { fields: f, etag } = await this.statusItem();
    const outcome = str(f.LastAttemptOutcome);
    let warnings = initialStatus.warnings;
    try {
      if (f.Warnings) warnings = JSON.parse(String(f.Warnings));
    } catch {
      warnings = initialStatus.warnings;
    }
    return {
      etag,
      status: {
        lastAttemptStartedAt: str(f.LastAttemptStartedAt),
        lastAttemptFinishedAt: str(f.LastAttemptFinishedAt),
        lastAttemptOutcome: outcome as SyncStatus['lastAttemptOutcome'],
        lastFailureCode: str(f.LastFailureCode),
        lastSuccessAt: str(f.LastSuccessAt),
        runningSince: str(f.RunningSince),
        lastManualRefreshAt: str(f.LastManualRefreshAt),
        dataMode: f.DataMode === 'Live' ? 'Live' : 'Sample',
        historyStartDate: date(f.HistoryStartDate),
        warnings,
      },
    };
  }

  async putStatus(status: SyncStatus, etag: string): Promise<string> {
    const item = await this.statusItem();
    const listId = await this.listId('status');
    const res = await this.call(this.site(`/lists/${listId}/items/${item.id}/fields`), {
      method: 'PATCH',
      headers: { 'If-Match': etag },
      body: JSON.stringify({
        LastAttemptStartedAt: status.lastAttemptStartedAt,
        LastAttemptFinishedAt: status.lastAttemptFinishedAt,
        LastSuccessAt: status.lastSuccessAt,
        RunningSince: status.runningSince,
        LastManualRefreshAt: status.lastManualRefreshAt,
        LastAttemptOutcome: status.lastAttemptOutcome,
        LastFailureCode: status.lastFailureCode,
        DataMode: status.dataMode,
        HistoryStartDate: status.historyStartDate,
        Warnings: JSON.stringify(status.warnings),
      }),
    });
    if (res.status === 412) throw new PreconditionFailed();
    if (!res.ok) throw new StoreError('GRAPH_WRITE');
    const updated = await this.getJson<{ '@odata.etag': string }>(this.site(`/lists/${listId}/items/${item.id}`));
    return updated['@odata.etag'];
  }

  async getSettings(): Promise<RawSettings> {
    return Object.fromEntries((await this.items('settings')).map((i) => [String(i.fields.Title), str(i.fields.Value) ?? '']));
  }
}
