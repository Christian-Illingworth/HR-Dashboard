// T098: the logger takes only fixed event names, failure codes and numeric counts, so names,
// sickness reasons and payloads can't be logged (constitution, Security & Data Handling).
import { describe, expect, it } from 'vitest';
import { createLogger } from '../../src/log';

const capture = () => {
  const lines: string[] = [];
  return { lines, log: createLogger((l) => lines.push(l)) };
};

describe('logger', () => {
  it('writes an event with a code and counts as JSON', () => {
    const { lines, log } = capture();
    log.info('sync.succeeded', { counts: { employees: 19, absences: 40 } });
    log.error('sync.failed', { code: 'BRIGHTHR_RATE_LIMIT' });
    expect(lines.map((l) => JSON.parse(l))).toEqual([
      { level: 'info', event: 'sync.succeeded', counts: { employees: 19, absences: 40 } },
      { level: 'error', event: 'sync.failed', code: 'BRIGHTHR_RATE_LIMIT' },
    ]);
  });

  it('refuses unknown events, unknown codes, text counts and extra fields at run time', () => {
    const { lines, log } = capture();
    const unsafe = log as unknown as { info: (e: string, f?: unknown) => void };
    expect(() => unsafe.info('Chloe Patel is off with back pain')).toThrow();
    expect(() => unsafe.info('sync.failed', { code: 'Back pain' })).toThrow();
    expect(() => unsafe.info('sync.succeeded', { counts: { name: 'Chloe Patel' } })).toThrow();
    expect(() => unsafe.info('sync.succeeded', { message: 'Back pain' })).toThrow();
    expect(lines).toEqual([]);
  });
});
