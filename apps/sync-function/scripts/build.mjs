// Builds the Function app: bundles src/ (and @hrd/core) into dist/index.js, and copies the
// synthetic fixtures so a deployment in BRIGHTHR_MODE=mock has its mock data. Synthetic only.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

await build({
  entryPoints: [here('../src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: here('../dist/index.js'),
  external: ['@azure/functions', '@azure/identity', 'jose'],
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  logLevel: 'info',
});

const target = here('../fixtures/');
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const part of ['brighthr', 'entra', 'settings.json']) cpSync(here(`../../../fixtures/${part}`), `${target}${part}`, { recursive: true });
console.log('Copied synthetic fixtures to apps/sync-function/fixtures/ for mock mode.');
