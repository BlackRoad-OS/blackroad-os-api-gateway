import dotenv from 'dotenv';
import fastify from 'fastify';

import authPlugin from './plugins/auth';
import graphqlPlugin from './plugins/graphql';
import proxyPlugin from './plugins/proxy';
import rateLimitPlugin from './plugins/rateLimit';
import integrationsPlugin from './plugins/integrations';
import healthRoute from './routes/health';
import versionRoute from './routes/version';
import integrationsRoute from './routes/integrations';

dotenv.config();

export function buildServer() {
  const app = fastify({
    logger: true,
  });

  // Core plugins
  app.register(rateLimitPlugin);
  app.register(authPlugin);
  app.register(proxyPlugin);
  app.register(graphqlPlugin);

  // Integrations
  app.register(integrationsPlugin, { autoInit: true });

  // Routes
  app.register(healthRoute);
  app.register(versionRoute);
  app.register(integrationsRoute);

  app.addHook('onReady', async () => {
    const serviceNames = app.serviceMap ? Object.keys(app.serviceMap) : [];
    app.log.info({ serviceNames }, 'service map loaded');
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
