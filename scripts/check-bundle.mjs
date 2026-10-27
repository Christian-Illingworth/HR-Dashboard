// Bundle check (tasks T092, quickstart Q8, constitution quality gate: "no secret appears in the
// client bundle"). Scans built JavaScript and CSS for things that must never ship to a browser.
//
// Usage: node scripts/check-bundle.mjs [dir ...]
// Default dirs: packages/dashboard-ui/dist and apps/webpart/release (when it exists).
// Exits 1 and lists every problem found.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));

/** Strings that must never appear in any shipped file. */
export const FORBIDDEN = [
  { text: 'api.bright.hr', why: 'BrightHR API host: the browser must never call BrightHR (Principle I)' },
  { text: 'login.brighthr.com', why: 'BrightHR token host (Principle I)' },
  { text: '@Microsoft.KeyVault', why: 'Key Vault reference' },
  { text: 'client_secret', why: 'OAuth client secret parameter' },
  { text: 'StateSimulatingClient', why: 'harness-only code' },
  { text: 'SIMULATED_STATES', why: 'harness-only code' },
];

/** A secret-looking assignment: a key-ish name followed by a long opaque value. */
const SECRET_LIKE = /(secret|password|passwd|api[_-]?key|access[_-]?key|private[_-]?key)["'`\s]*[:=]\s*["'`][A-Za-z0-9+/=_.~-]{16,}["'`]/i;

/** Synthetic fixture markers: allowed only in a lazily loaded chunk (research R14). */
const FIXTURE_MARKERS = ['consultiv.example', 'a0000000-0000-4000-8000-'];
/** Present in the always-loaded entry bundle of the library or the web part. */
const ENTRY_MARKERS = ['mountDashboard', 'HrDashboardWebPart'];

export function checkContent(name, content) {
  const problems = [];
  for (const f of FORBIDDEN) if (content.includes(f.text)) problems.push(`${name}: contains "${f.text}" (${f.why})`);
  const secret = content.match(SECRET_LIKE);
  if (secret) problems.push(`${name}: looks like a secret value (${secret[0].slice(0, 24)}…)`);
  const hasFixtures = FIXTURE_MARKERS.some((m) => content.includes(m));
  const isEntry = ENTRY_MARKERS.some((m) => content.includes(m));
  if (hasFixtures && isEntry) problems.push(`${name}: mock data is in the always-loaded bundle; it must stay in the lazy mock-data chunk`);
  return problems;
}

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(js|mjs|cjs|css|html|json)$/.test(entry) && !entry.endsWith('.map')) yield path;
  }
}

export function checkDirs(dirs) {
  const problems = [];
  let scanned = 0;
  for (const dir of dirs) {
    for (const file of files(dir)) {
      scanned++;
      problems.push(...checkContent(relative(repo, file), readFileSync(file, 'utf8')));
    }
  }
  return { scanned, problems };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const dirs = (args.length ? args : ['packages/dashboard-ui/dist', 'apps/webpart/release'])
    .map((d) => join(repo, d))
    .filter((d) => existsSync(d));
  if (dirs.length === 0) {
    console.error('Nothing to check: build first (npm run build:webpart).');
    process.exit(1);
  }
  const { scanned, problems } = checkDirs(dirs);
  if (problems.length) {
    console.error(`Bundle check FAILED (${problems.length} problem${problems.length === 1 ? '' : 's'} in ${scanned} files):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`Bundle check passed: ${scanned} files in ${dirs.map((d) => relative(repo, d)).join(', ')}.`);
}
