import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(__filename);
const cloudFunctionsDir = path.resolve(scriptsDir, '..');
const manifestPath = path.join(cloudFunctionsDir, 'cloudfunctions.json');
const distRoot = path.join(cloudFunctionsDir, 'dist');

const envName = process.argv[2];

if (!envName) {
  throw new Error('Usage: node render-deploy-config.mjs <dev|prod>');
}

const envFileCandidates = [
  path.join(cloudFunctionsDir, `.env.${envName}.local`),
  path.join(cloudFunctionsDir, '.env.local'),
  path.join(cloudFunctionsDir, `.env.${envName}`)
];

const envFile = envFileCandidates.find((candidate) => existsSync(candidate));

if (!envFile) {
  throw new Error(`Missing env file. Expected one of: ${envFileCandidates.join(', ')}`);
}

function parseEnvFile(content) {
  const output = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    output[key] = value;
  }

  return output;
}

const env = parseEnvFile(readFileSync(envFile, 'utf8'));
const requiredKeys = ['CLOUDBASE_ENV_ID', 'WECHAT_APP_ID'];

for (const key of requiredKeys) {
  if (!env[key]) {
    throw new Error(`Missing required key ${key} in ${envFile}`);
  }
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const releaseChannel = env.RELEASE_CHANNEL || `manual-${envName}`;
const functionRuntime = env.CLOUDBASE_FUNCTION_RUNTIME || 'Nodejs24.11';

const config = {
  version: '2.0',
  envId: env.CLOUDBASE_ENV_ID,
  functionRoot: 'functions',
  functions: manifest.functions.map((definition) => ({
    name: definition.name,
    handler: 'index.main',
    runtime: functionRuntime,
    timeout: 10,
    memorySize: 256,
    installDependency: true,
    envVariables: {
      CLOUDBASE_ENV_NAME: env.CLOUDBASE_ENV_NAME || envName,
      CLOUDBASE_ENV_ID: env.CLOUDBASE_ENV_ID,
      WECHAT_APP_ID: env.WECHAT_APP_ID,
      RELEASE_CHANNEL: releaseChannel
    }
  }))
};

writeFileSync(path.join(distRoot, 'cloudbaserc.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');

console.log(`Wrote deploy config from ${path.basename(envFile)} to dist/cloudbaserc.json with runtime ${functionRuntime}`);
