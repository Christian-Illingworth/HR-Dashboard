// A logger that can only say safe things: fixed event names, fixed failure codes and numbers.
// It has no free-text or object parameters, so names, sickness reasons and BrightHR payloads
// can't reach logs or telemetry (constitution, Security & Data Handling; research R19).

export const EVENTS = [
  'sync.started',
  'sync.succeeded',
  'sync.failed',
  'sync.skipped.locked',
  'sync.scheduled',
  'sync.notScheduled',
  'refresh.queued',
  'refresh.alreadyRunning',
  'refresh.tooSoon',
  'dashboard.served',
  'dashboard.badRequest',
  'dashboard.unavailable',
  'auth.rejected',
] as const;
export type LogEvent = (typeof EVENTS)[number];

export const FAILURE_CODES = [
  'BRIGHTHR_AUTH',
  'BRIGHTHR_RATE_LIMIT',
  'BRIGHTHR_UNAVAILABLE',
  'BRIGHTHR_REJECTED',
  'GRAPH_READ',
  'GRAPH_WRITE',
  'STORE_SCHEMA',
  'SETTINGS_INVALID',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'UNKNOWN',
] as const;
export type FailureCode = (typeof FAILURE_CODES)[number];

export interface LogFields {
  code?: FailureCode;
  counts?: Record<string, number>;
}

export interface Logger {
  info(event: LogEvent, fields?: LogFields): void;
  error(event: LogEvent, fields?: LogFields): void;
}

function check(event: string, fields: LogFields | undefined) {
  if (!(EVENTS as readonly string[]).includes(event)) throw new Error('Unknown log event');
  if (!fields) return;
  for (const key of Object.keys(fields)) if (key !== 'code' && key !== 'counts') throw new Error('Unknown log field');
  if (fields.code !== undefined && !(FAILURE_CODES as readonly string[]).includes(fields.code)) throw new Error('Unknown failure code');
  for (const [k, v] of Object.entries(fields.counts ?? {})) {
    if (!/^[a-zA-Z]+$/.test(k) || typeof v !== 'number' || !Number.isFinite(v)) throw new Error('Counts must be numbers');
  }
}

export function createLogger(sink: (line: string) => void = (l) => console.log(l)): Logger {
  const write = (level: 'info' | 'error', event: LogEvent, fields?: LogFields) => {
    check(event, fields);
    sink(JSON.stringify({ level, event, ...(fields?.code ? { code: fields.code } : {}), ...(fields?.counts ? { counts: fields.counts } : {}) }));
  };
  return { info: (e, f) => write('info', e, f), error: (e, f) => write('error', e, f) };
}
