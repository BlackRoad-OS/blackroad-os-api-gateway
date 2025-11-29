import fastifyJwt, { JWT } from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export type AuthenticatedRequest = FastifyRequest & { jwt: JWT };

async function authPlugin(fastify: FastifyInstance) {
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'development-secret',
  });

  fastify.decorate(
    'verifyJWT',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // TODO(gateway-next): Integrate real authz and audience checks.
      try {
        await request.jwtVerify();
      } catch (error) {
        request.log.warn({ err: error }, 'JWT verification failed');
        reply.code(401).send({ error: 'Unauthorized' });
      }
    }
  );
}

declare module 'fastify' {
  interface FastifyInstance {
    verifyJWT(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export default fp(authPlugin, {
  name: 'auth-plugin',
});
