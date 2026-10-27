// @vitest-environment node
// T092: the bundle check catches what must never ship to the browser.
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain ESM script without type declarations
import { checkContent } from '../../../scripts/check-bundle.mjs';

describe('bundle check', () => {
  it('passes clean code', () => {
    expect(checkContent('main.js', 'export function mountDashboard(){}')).toEqual([]);
  });

  it.each([
    ['fetch("https://api.bright.hr/employees/v1/query")', 'api.bright.hr'],
    ['url = "https://login.brighthr.com/connect/token"', 'login.brighthr.com'],
    ['x = "@Microsoft.KeyVault(SecretUri=…)"', '@Microsoft.KeyVault'],
    ['body = "client_secret=abc"', 'client_secret'],
    ['new StateSimulatingClient(c, s)', 'StateSimulatingClient'],
  ])('flags %s', (content, text) => {
    expect(checkContent('x.js', content).join('\n')).toContain(text);
  });

  it('flags a secret-looking value', () => {
    expect(checkContent('x.js', 'const apiKey = "Zx8Qe1Lr0Pq7Tn5Wv2Ys9Kd4"')).toHaveLength(1);
  });

  it('allows mock data in a lazy chunk but not in the entry bundle', () => {
    const fixture = '{"email":"ben.okafor@consultiv.example"}';
    expect(checkContent('chunks/sampleData.js', fixture)).toEqual([]);
    expect(checkContent('main.js', `export function mountDashboard(){}; ${fixture}`).join()).toContain('always-loaded bundle');
  });
});
