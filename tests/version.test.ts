import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../src/index';
import { name, version } from '../package.json';

describe('version route', () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns package metadata and commit sha', async () => {
    const response = await request(app.server).get('/version');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      service: name,
      version,
      commit: 'dev',
    });
  });
});
