import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(__filename);
const cloudFunctionsDir = path.resolve(scriptsDir, '..');
const distFunctionsDir = path.join(cloudFunctionsDir, 'dist', 'functions');
const uploadDir = path.join(cloudFunctionsDir, 'upload-packages');

if (!existsSync(distFunctionsDir)) {
  throw new Error('Missing dist/functions. Run pnpm --filter @xiaipet/cloud-functions build first.');
}

mkdirSync(uploadDir, { recursive: true });

for (const entry of readdirSync(uploadDir)) {
  if (entry.endsWith('.zip')) {
    rmSync(path.join(uploadDir, entry), { force: true });
  }
}

for (const name of readdirSync(distFunctionsDir)) {
  const functionDir = path.join(distFunctionsDir, name);
  if (!statSync(functionDir).isDirectory()) {
    continue;
  }
  const zipPath = path.join(uploadDir, `${name}.zip`);
  const topLevelEntries = readdirSync(functionDir);

  for (const requiredEntry of ['index.js', 'package.json']) {
    if (!topLevelEntries.includes(requiredEntry)) {
      throw new Error(`Missing ${requiredEntry} in ${functionDir}`);
    }
  }

  const entries = [
    'index.js',
    'package.json',
    ...topLevelEntries.filter((entry) => entry !== 'index.js' && entry !== 'package.json')
  ];

  // Keep pnpm dependency links as links; following them can make zip recurse for a long time.
  const result = spawnSync('zip', ['-qry', zipPath, ...entries], {
    cwd: functionDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const entryCheck = spawnSync('unzip', ['-p', zipPath, 'index.js'], {
    stdio: 'ignore'
  });

  if (entryCheck.status !== 0) {
    throw new Error(`Function ${name} upload zip does not expose index.js at archive root.`);
  }
}

console.log(`Created upload zips in ${uploadDir}`);
