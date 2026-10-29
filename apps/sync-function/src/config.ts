// Configuration from app settings (research R14, R19). Validated at start-up; values are never
// logged or put in error messages. BrightHR credentials arrive as Key Vault references resolved
// by the platform. There is deliberately no setting that turns authorization off.

import { resolve } from 'node:path';

export interface Config {
  brightHrMode: 'mock' | 'live';
  storeMode: 'file' | 'sharepoint';
  /** FR-024: 1 normally, 2 on the rate-limit fallback. */
  syncIntervalHours: 1 | 2;
  localDataDir: string;
  /** Root of the synthetic fixtures served by the mock clients. */
  fixturesDir: string;
  dataSiteId?: string;
  tenantId?: string;
  apiAudience?: string;
  brightHr?: { clientId: string; clientSecret: string };
}

export class ConfigError extends Error {
  constructor(setting: string, problem: string) {
    super(`App setting ${setting} ${problem}.`);
    this.name = 'ConfigError';
  }
}

type Env = Record<string, string | undefined>;

function oneOf<T extends string>(env: Env, key: string, allowed: readonly T[], fallback: T): T {
  const value = env[key]?.trim();
  if (value === undefined || value === '') return fallback;
  if (!(allowed as readonly string[]).includes(value)) throw new ConfigError(key, `must be one of ${allowed.join(', ')}`);
  return value as T;
}

function required(env: Env, key: string, why: string): string {
  const value = env[key]?.trim();
  if (!value) throw new ConfigError(key, `is required ${why}`);
  return value;
}

export function loadConfig(env: Env = process.env, opts: { requireApi?: boolean } = {}): Config {
  const brightHrMode = oneOf(env, 'BRIGHTHR_MODE', ['mock', 'live'] as const, 'mock');
  const storeMode = oneOf(env, 'STORE_MODE', ['file', 'sharepoint'] as const, 'file');
  const interval = oneOf(env, 'SYNC_DAYTIME_INTERVAL_HOURS', ['1', '2'] as const, '1');

  const config: Config = {
    brightHrMode,
    storeMode,
    syncIntervalHours: interval === '2' ? 2 : 1,
    localDataDir: resolve(env.LOCAL_DATA_DIR?.trim() || '.local-data'),
    fixturesDir: resolve(env.FIXTURES_DIR?.trim() || 'fixtures'),
  };
  if (env.TENANT_ID?.trim()) config.tenantId = env.TENANT_ID.trim();
  if (env.API_AUDIENCE?.trim()) config.apiAudience = env.API_AUDIENCE.trim();

  if (storeMode === 'sharepoint') config.dataSiteId = required(env, 'DATA_SITE_ID', 'when STORE_MODE is sharepoint');
  if (brightHrMode === 'live') {
    config.brightHr = {
      clientId: required(env, 'BRIGHTHR_CLIENT_ID', 'when BRIGHTHR_MODE is live'),
      clientSecret: required(env, 'BRIGHTHR_CLIENT_SECRET', 'when BRIGHTHR_MODE is live'),
    };
  }
  if (opts.requireApi) {
    required(env, 'TENANT_ID', 'for the dashboard API');
    required(env, 'API_AUDIENCE', 'for the dashboard API');
  }
  return config;
}
