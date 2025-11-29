import fastifyHttpProxy from '@fastify/http-proxy';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

import { ServiceMap } from '../types';

function registerProxy(
  fastify: FastifyInstance,
  path: string,
  target: string,
  prefixRewrite = ''
) {
  fastify.register(fastifyHttpProxy, {
    upstream: target,
    prefix: path,
    rewritePrefix: prefixRewrite,
    replyOptions: {
      rewriteRequestHeaders: (_req, headers) => ({
        ...headers,
        'x-gateway-proxied': 'true',
      }),
    },
  });
}

async function proxyPlugin(fastify: FastifyInstance) {
  const services: ServiceMap = {
    api: process.env.SERVICE_API_URL || 'http://localhost:4100',
    operator: process.env.SERVICE_OPERATOR_URL || 'http://localhost:4200',
    core: process.env.SERVICE_CORE_URL || 'http://localhost:4300',
    prism: process.env.SERVICE_PRISM_URL || 'http://localhost:4400',
  };

  registerProxy(fastify, '/api', services.api, '/');
  registerProxy(fastify, '/operator', services.operator, '/');
  registerProxy(fastify, '/core', services.core, '/');
  registerProxy(fastify, '/prism', services.prism, '/');

  fastify.decorate('serviceMap', services);
}

declare module 'fastify' {
  interface FastifyInstance {
    serviceMap: ServiceMap;
  }
}

export default fp(proxyPlugin, {
  name: 'proxy-plugin',
});
