import { describe, expect, it } from 'vitest';

import { loadApiConfig } from './env';

describe('loadApiConfig', () => {
  it('returns safe defaults for local development', () => {
    expect(loadApiConfig({})).toEqual({
      nodeEnv: 'development',
      host: '0.0.0.0',
      port: 3000,
      logLevel: 'info',
      publicBaseUrl: 'http://127.0.0.1:3000'
    });
  });

  it('accepts valid overrides', () => {
    expect(
      loadApiConfig({
        NODE_ENV: 'production',
        API_HOST: '127.0.0.1',
        API_PORT: '8080',
        LOG_LEVEL: 'warn',
        API_PUBLIC_BASE_URL: 'https://api.xiaipet.vip'
      })
    ).toEqual({
      nodeEnv: 'production',
      host: '127.0.0.1',
      port: 8080,
      logLevel: 'warn',
      publicBaseUrl: 'https://api.xiaipet.vip'
    });
  });

  it('rejects invalid ports', () => {
    expect(() => loadApiConfig({ API_PORT: '70000' })).toThrow('Invalid API_PORT');
    expect(() => loadApiConfig({ API_PORT: 'abc' })).toThrow('Invalid API_PORT');
  });

  it('rejects invalid log levels', () => {
    expect(() => loadApiConfig({ LOG_LEVEL: 'verbose' })).toThrow('Invalid LOG_LEVEL');
  });
});
