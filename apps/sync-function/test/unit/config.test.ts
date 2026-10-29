// T097: configuration is validated at start-up, mock is the default, and nothing turns auth off.
import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../src/config';

const base = { TENANT_ID: 'tenant-1', API_AUDIENCE: 'api://hr-dashboard' };

describe('loadConfig', () => {
  it('defaults to mock BrightHR, the file store and an hourly interval', () => {
    const c = loadConfig({});
    expect(c).toMatchObject({ brightHrMode: 'mock', storeMode: 'file', syncIntervalHours: 1 });
    expect(c.localDataDir).toMatch(/\.local-data$/);
  });

  it('reads the documented settings', () => {
    const c = loadConfig({ ...base, BRIGHTHR_MODE: 'mock', STORE_MODE: 'sharepoint', DATA_SITE_ID: 'site-1', SYNC_DAYTIME_INTERVAL_HOURS: '2' });
    expect(c).toMatchObject({ storeMode: 'sharepoint', dataSiteId: 'site-1', syncIntervalHours: 2, tenantId: 'tenant-1', apiAudience: 'api://hr-dashboard' });
  });

  it('needs BrightHR credentials only in live mode', () => {
    expect(() => loadConfig({ BRIGHTHR_MODE: 'live' })).toThrow(ConfigError);
    const live = loadConfig({ BRIGHTHR_MODE: 'live', BRIGHTHR_CLIENT_ID: 'id', BRIGHTHR_CLIENT_SECRET: 'value' });
    expect(live.brightHr).toEqual({ clientId: 'id', clientSecret: 'value' });
    expect(loadConfig({}).brightHr).toBeUndefined();
  });

  it('needs a data site for the SharePoint store, and the tenant and audience for the API', () => {
    expect(() => loadConfig({ STORE_MODE: 'sharepoint' })).toThrow(ConfigError);
    expect(() => loadConfig({}, { requireApi: true })).toThrow(ConfigError);
    expect(loadConfig(base, { requireApi: true }).apiAudience).toBe('api://hr-dashboard');
  });

  it.each([
    [{ BRIGHTHR_MODE: 'demo' }],
    [{ STORE_MODE: 'memory' }],
    [{ SYNC_DAYTIME_INTERVAL_HOURS: '3' }],
  ])('rejects an unknown value %j', (env) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
  });

  it('never puts a setting value in an error message', () => {
    try {
      loadConfig({ BRIGHTHR_MODE: 'live', BRIGHTHR_CLIENT_ID: 'visible-id' });
    } catch (e) {
      expect(String(e)).not.toContain('visible-id');
    }
  });

  it('has no setting that turns authorization off', () => {
    const c = loadConfig({ ...base, AUTH_DISABLED: 'true', SKIP_AUTH: '1', AUTH_MODE: 'none' }) as unknown as Record<string, unknown>;
    expect(Object.keys(c).some((k) => /auth/i.test(k))).toBe(false);
  });
});
