import { buildApp } from './app';
import { loadApiConfig } from './config/env';

async function main() {
  const config = loadApiConfig();
  const app = buildApp();

  await app.listen({
    host: config.host,
    port: config.port
  });
}

main().catch((error) => {
  console.error('api_startup_failed', error);
  process.exit(1);
});
