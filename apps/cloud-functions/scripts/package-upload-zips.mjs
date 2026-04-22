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
  const result = spawnSync('zip', ['-qr', zipPath, '.'], {
    cwd: functionDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Created upload zips in ${uploadDir}`);
