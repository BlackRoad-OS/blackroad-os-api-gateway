import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../src/index';

describe('health route', () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns ok', async () => {
    const response = await request(app.server).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('uptime');
  });
});
