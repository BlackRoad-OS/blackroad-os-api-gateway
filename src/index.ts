import dotenv from 'dotenv';
import fastify from 'fastify';

import authPlugin from './plugins/auth';
import graphqlPlugin from './plugins/graphql';
import proxyPlugin from './plugins/proxy';
import rateLimitPlugin from './plugins/rateLimit';
import healthRoute from './routes/health';
import versionRoute from './routes/version';

dotenv.config();

export function buildServer() {
  const app = fastify({
    logger: true,
  });

  app.register(rateLimitPlugin);
  app.register(authPlugin);
  app.register(proxyPlugin);
  app.register(graphqlPlugin);
  app.register(healthRoute);
  app.register(versionRoute);

  app.addHook('onReady', async () => {
    app.log.info({ services: app.serviceMap }, 'service map loaded');
  });

  return app;
}

async function start() {
  const app = buildServer();
  const port = Number(process.env.PORT || 4000);
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port, host });
    app.log.info(`Gateway listening on http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  void start();
}
