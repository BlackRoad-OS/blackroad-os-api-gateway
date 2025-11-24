import { FastifyInstance } from 'fastify';

export default async function versionRoute(fastify: FastifyInstance) {
  fastify.get('/version', async () => ({
    version: '0.0.1',
    commit: process.env.COMMIT_SHA || 'dev',
  }));
}
