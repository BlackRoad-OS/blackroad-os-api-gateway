import fastifyRateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

async function rateLimitPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyRateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX || 100),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    allowList: (process.env.RATE_LIMIT_ALLOWLIST || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  });
}

export default fp(rateLimitPlugin, {
  name: 'rate-limit-plugin',
});
