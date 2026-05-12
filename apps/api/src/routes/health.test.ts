import { describe, expect, it } from 'vitest';

import { buildApp } from '../app';

describe('health route', () => {
  it('returns a safe health response without secrets', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
      service: 'xiaipet-api'
    });
    expect(typeof body.uptimeSeconds).toBe('number');
    expect(Object.keys(body).sort()).toEqual(['ok', 'service', 'uptimeSeconds']);
    expect(body).not.toHaveProperty('headers');
    expect(body).not.toHaveProperty('DATABASE_URL');
    expect(body).not.toHaveProperty('OSS_ACCESS_KEY_SECRET');
    expect(body).not.toHaveProperty('CUSTOMER_WECHAT_APP_SECRET');
    expect(body).not.toHaveProperty('MERCHANT_WECHAT_APP_SECRET');
    expect(body).not.toHaveProperty('stack');
    expect(body).not.toHaveProperty('env');
    expect(JSON.stringify(body)).not.toMatch(/SECRET|PASSWORD|TOKEN|API_HOST|API_PORT/i);
  });
});
