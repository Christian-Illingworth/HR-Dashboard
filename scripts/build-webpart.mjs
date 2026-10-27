// npm run build:webpart (tasks T040, T092): builds the UI library, then the SPFx package, then
// runs the bundle check over both. A human uploads the resulting .sppkg (CLAUDE.md: Claude never
// deploys).
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const run = (cmd, cwd = repo) => execSync(cmd, { cwd, stdio: 'inherit' });

run('npm run build -w @hrd/dashboard-ui');

const webpart = fileURLToPath(new URL('../apps/webpart/', import.meta.url));
if (!existsSync(`${webpart}package.json`)) {
  run('node scripts/check-bundle.mjs packages/dashboard-ui/dist');
  console.error(
    '\nThe SPFx web part (apps/webpart) has not been scaffolded yet (tasks T008, T039, T040).\n' +
      'SPFx 1.23.2 needs Node >= 22.14 and < 23; this machine runs ' + process.version + '.\n' +
      'The UI library above was built and checked.',
  );
  process.exit(1);
}

const [major, minor] = process.versions.node.split('.').map(Number);
if (major !== 22 || minor < 14) {
  console.error(`SPFx 1.23.2 needs Node >= 22.14 and < 23; this is ${process.version}. Switch Node (see .nvmrc) and try again.`);
  process.exit(1);
}
run('npm run build', webpart);
run('node scripts/check-bundle.mjs packages/dashboard-ui/dist apps/webpart/release');
console.log('\nPackage: apps/webpart/sharepoint/solution/*.sppkg (a SharePoint admin uploads it).');
