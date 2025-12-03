import { FastifyInstance } from 'fastify';
import { name, version } from '../../package.json';

export default async function versionRoute(fastify: FastifyInstance) {
  fastify.get('/version', async () => ({
    service: name,
    version,
    commit: process.env.COMMIT_SHA || 'dev',
  }));
}
