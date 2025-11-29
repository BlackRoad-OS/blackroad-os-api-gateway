import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import mercurius from 'mercurius';

const typeDefs = /* GraphQL */ `
  type Query {
    _ping: String
  }

  # TODO(gateway-next): Extend schema with federation v2 directives and compose remote schemas.
`;

const resolvers = {
  Query: {
    _ping: async () => 'pong',
  },
};

async function graphqlPlugin(fastify: FastifyInstance) {
  fastify.register(mercurius, {
    schema: typeDefs,
    resolvers,
    graphiql: process.env.NODE_ENV !== 'production',
    context: () => ({
      // TODO(gateway-next): Inject authenticated user + stitched service clients.
    }),
  });
}

export default fp(graphqlPlugin, {
  name: 'graphql-plugin',
});
