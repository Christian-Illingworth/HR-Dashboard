// FileStore: one JSON file per list under LOCAL_DATA_DIR (default .local-data/, gitignored).
// For local development with mock data only.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DashboardRecords, RawSettings, SyncStatus } from '@hrd/core';
import {
  contentHash,
  defaultSettings,
  initialStatus,
  keyOf,
  PreconditionFailed,
  type ChangeCounts,
  type Changes,
  type KeyedChanges,
  type Store,
} from './Store';

type ListName = 'employees' | 'history' | 'absences' | 'reasons';

export class FileStore implements Store {
  constructor(private readonly dir: string) {}

  private file(name: string) {
    return join(this.dir, `${name}.json`);
  }
  private read<T>(name: string, fallback: T): T {
    const f = this.file(name);
    return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as T) : fallback;
  }
  private write(name: string, value: unknown) {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.file(name), JSON.stringify(value, null, 1) + '\n');
  }

  async checkSchema(): Promise<void> {}

  async readAll(): Promise<DashboardRecords> {
    return {
      employees: this.read('employees', []),
      history: this.read('history', []),
      absences: this.read('absences', []),
      reasons: this.read('reasons', []),
    };
  }

  async applyChanges(changes: Changes): Promise<ChangeCounts> {
    const counts = { written: 0, deleted: 0, unchanged: 0 };
    const apply = <T extends object>(name: ListName, key: (t: T) => string, c: KeyedChanges<T> | undefined) => {
      if (!c) return;
      const items = new Map(this.read<T[]>(name, []).map((t) => [key(t), t]));
      for (const k of c.delete) if (items.delete(k)) counts.deleted++;
      for (const t of c.upsert) {
        const existing = items.get(key(t));
        if (existing && contentHash(existing) === contentHash(t)) counts.unchanged++;
        else {
          items.set(key(t), t);
          counts.written++;
        }
      }
      this.write(name, [...items.values()]);
    };
    apply('employees', keyOf.employees, changes.employees);
    apply('history', keyOf.history, changes.history);
    apply('absences', keyOf.absences, changes.absences);
    if (changes.reasons) {
      // Replace wholesale: delete every stored reason that isn't in the new list.
      const keep = new Set(changes.reasons.replace.map(keyOf.reasons));
      const stale = this.read<{ absenceId: string }[]>('reasons', []).map((r) => r.absenceId).filter((k) => !keep.has(k));
      apply('reasons', keyOf.reasons, { upsert: changes.reasons.replace, delete: stale });
    }
    return counts;
  }

  async getStatus(): Promise<{ status: SyncStatus; etag: string }> {
    return this.read('status', { status: initialStatus, etag: '0' });
  }

  async putStatus(status: SyncStatus, etag: string): Promise<string> {
    const current = await this.getStatus();
    if (current.etag !== etag) throw new PreconditionFailed();
    const next = String(Number(current.etag) + 1);
    this.write('status', { status, etag: next });
    return next;
  }

  async getSettings(): Promise<RawSettings> {
    return this.read('settings', defaultSettings);
  }

  /** Local development only: seed the settings list. */
  writeSettings(settings: RawSettings) {
    this.write('settings', settings);
  }
}
