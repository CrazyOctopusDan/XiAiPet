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
    expect(JSON.stringify(body)).not.toMatch(/SECRET|PASSWORD|TOKEN|API_HOST|API_PORT/i);
  });
});
