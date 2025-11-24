import fastifyJwt, { JWT } from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export type AuthenticatedRequest = FastifyRequest & { jwt: JWT };

async function authPlugin(fastify: FastifyInstance) {
  let jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable must be set in production.');
    } else {
      jwtSecret = 'development-secret';
      fastify.log.warn('Using development JWT secret. Do NOT use this in production!');
    }
  }
  fastify.register(fastifyJwt, {
    secret: jwtSecret,
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
