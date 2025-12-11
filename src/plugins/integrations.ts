/**
 * Integrations Plugin
 * Fastify plugin for managing platform integrations
 */

import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  IntegrationManager,
  getIntegrationManager,
  type IntegrationConfig,
} from '../integrations/manager';

// Platform integrations
import { initRailway, railwayHealthCheck } from '../integrations/platforms/railway';
import { initCloudflare, cloudflareHealthCheck } from '../integrations/platforms/cloudflare';
import { initVercel, vercelHealthCheck } from '../integrations/platforms/vercel';
import { initDigitalOcean, digitalOceanHealthCheck } from '../integrations/platforms/digitalocean';
import { initDocker, dockerHealthCheck } from '../integrations/platforms/docker';

// Tool integrations
import { initWarp, warpHealthCheck } from '../integrations/tools/warp';
import { initShellfish, shellfishHealthCheck } from '../integrations/tools/shellfish';
import { initWorkingCopy, workingCopyHealthCheck } from '../integrations/tools/working-copy';
import { initPyto, pytoHealthCheck } from '../integrations/tools/pyto';

// Service integrations
import { initAsana, asanaHealthCheck } from '../integrations/services/asana';
import { initNotion, notionHealthCheck } from '../integrations/services/notion';

// Auth integrations
import { initClerk, clerkHealthCheck } from '../integrations/auth/clerk';

// Payment integrations
import { initStripe, stripeHealthCheck } from '../integrations/payments/stripe';

// AI integrations
import { initHuggingFace, huggingFaceHealthCheck } from '../integrations/ai/huggingface';
import { initOSSModels, ossModelsHealthCheck } from '../integrations/ai/oss-models';

// Network integrations
import { initTunnels, tunnelsHealthCheck } from '../integrations/network/tunnels';

declare module 'fastify' {
  interface FastifyInstance {
    integrations: IntegrationManager;
  }
}

interface IntegrationsPluginOptions {
  autoInit?: boolean;
}

const integrationsPlugin: FastifyPluginAsync<IntegrationsPluginOptions> = async (
  fastify: FastifyInstance,
  options: IntegrationsPluginOptions
) => {
  const manager = getIntegrationManager(fastify);

  // Helper to check if an integration is enabled via env vars
  const isEnabled = (name: string): boolean => {
    const envKey = `ENABLE_${name.toUpperCase().replace(/-/g, '_')}`;
    const value = process.env[envKey];
    return value === 'true' || value === '1';
  };

  // Helper to get config from env
  const getConfig = (name: string): IntegrationConfig => ({
    enabled: isEnabled(name),
    apiKey: process.env[`${name.toUpperCase().replace(/-/g, '_')}_API_KEY`],
    apiSecret: process.env[`${name.toUpperCase().replace(/-/g, '_')}_API_SECRET`],
    webhookSecret: process.env[`${name.toUpperCase().replace(/-/g, '_')}_WEBHOOK_SECRET`],
  });

  // Register platform integrations
  manager.register(
    'railway',
    (config) => initRailway({ ...config, projectId: process.env.RAILWAY_PROJECT_ID }),
    railwayHealthCheck({
      ...getConfig('railway'),
      projectId: process.env.RAILWAY_PROJECT_ID,
    }),
    { ...getConfig('railway'), apiKey: process.env.RAILWAY_TOKEN }
  );

  manager.register(
    'cloudflare',
    (config) =>
      initCloudflare({
        ...config,
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      }),
    cloudflareHealthCheck({
      ...getConfig('cloudflare'),
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    }),
    { ...getConfig('cloudflare'), apiKey: process.env.CLOUDFLARE_API_TOKEN }
  );

  manager.register(
    'vercel',
    (config) =>
      initVercel({
        ...config,
        teamId: process.env.VERCEL_TEAM_ID,
        projectId: process.env.VERCEL_PROJECT_ID,
      }),
    vercelHealthCheck({
      ...getConfig('vercel'),
      teamId: process.env.VERCEL_TEAM_ID,
    }),
    { ...getConfig('vercel'), apiKey: process.env.VERCEL_TOKEN }
  );

  manager.register(
    'digitalocean',
    (config) =>
      initDigitalOcean({
        ...config,
        defaultRegion: process.env.DO_DEFAULT_REGION,
      }),
    digitalOceanHealthCheck(getConfig('digitalocean')),
    { ...getConfig('digitalocean'), apiKey: process.env.DIGITALOCEAN_TOKEN }
  );

  manager.register(
    'docker',
    (config) =>
      initDocker({
        ...config,
        host: process.env.DOCKER_HOST,
        registryUrl: process.env.DOCKER_REGISTRY_URL,
      }),
    dockerHealthCheck({
      ...getConfig('docker'),
      host: process.env.DOCKER_HOST,
    }),
    getConfig('docker')
  );

  // Register tool integrations
  manager.register(
    'warp',
    initWarp,
    warpHealthCheck(getConfig('warp')),
    { ...getConfig('warp'), enabled: true } // Always enabled as local tool
  );

  manager.register(
    'shellfish',
    initShellfish,
    shellfishHealthCheck(getConfig('shellfish')),
    { ...getConfig('shellfish'), enabled: true }
  );

  manager.register(
    'working-copy',
    initWorkingCopy,
    workingCopyHealthCheck({
      ...getConfig('working-copy'),
      urlKey: process.env.WORKING_COPY_URL_KEY,
    }),
    { ...getConfig('working-copy'), enabled: true }
  );

  manager.register(
    'pyto',
    initPyto,
    pytoHealthCheck(getConfig('pyto')),
    { ...getConfig('pyto'), enabled: true }
  );

  // Register service integrations
  manager.register(
    'asana',
    (config) =>
      initAsana({
        ...config,
        workspaceId: process.env.ASANA_WORKSPACE_ID,
        defaultProjectId: process.env.ASANA_DEFAULT_PROJECT_ID,
      }),
    asanaHealthCheck({
      ...getConfig('asana'),
      workspaceId: process.env.ASANA_WORKSPACE_ID,
    }),
    { ...getConfig('asana'), apiKey: process.env.ASANA_ACCESS_TOKEN }
  );

  manager.register(
    'notion',
    (config) =>
      initNotion({
        ...config,
        defaultDatabaseId: process.env.NOTION_DATABASE_ID,
        deploymentLogsDatabaseId: process.env.NOTION_DEPLOYMENTS_DB_ID,
        incidentsDatabaseId: process.env.NOTION_INCIDENTS_DB_ID,
      }),
    notionHealthCheck(getConfig('notion')),
    { ...getConfig('notion'), apiKey: process.env.NOTION_API_KEY }
  );

  // Register auth integrations
  manager.register(
    'clerk',
    (config) =>
      initClerk({
        ...config,
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
        jwtKey: process.env.CLERK_JWT_KEY,
      }),
    clerkHealthCheck({
      ...getConfig('clerk'),
      secretKey: process.env.CLERK_SECRET_KEY,
    }),
    {
      ...getConfig('clerk'),
      apiSecret: process.env.CLERK_SECRET_KEY,
    }
  );

  // Register payment integrations
  manager.register(
    'stripe',
    (config) =>
      initStripe({
        ...config,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      }),
    stripeHealthCheck({
      ...getConfig('stripe'),
      apiKey: process.env.STRIPE_SECRET_KEY,
    }),
    {
      ...getConfig('stripe'),
      apiKey: process.env.STRIPE_SECRET_KEY,
    }
  );

  // Register AI integrations
  manager.register(
    'huggingface',
    (config) =>
      initHuggingFace({
        ...config,
        defaultModel: process.env.HF_DEFAULT_MODEL,
        inferenceEndpoint: process.env.HF_INFERENCE_ENDPOINT,
      }),
    huggingFaceHealthCheck(getConfig('huggingface')),
    { ...getConfig('huggingface'), apiKey: process.env.HUGGINGFACE_API_KEY }
  );

  manager.register(
    'oss-models',
    (config) =>
      initOSSModels({
        ...config,
        defaultProvider:
          (process.env.OSS_MODELS_PROVIDER as 'huggingface' | 'ollama') || 'huggingface',
        enabledModels: process.env.OSS_ENABLED_MODELS?.split(','),
      }),
    ossModelsHealthCheck(getConfig('oss-models')),
    { ...getConfig('oss-models'), enabled: true } // Always enabled as registry
  );

  // Register network integrations
  manager.register(
    'tunnels',
    (config) =>
      initTunnels({
        ...config,
        cloudflare: {
          tunnelId: process.env.CLOUDFLARE_TUNNEL_ID || '',
          tunnelSecret: process.env.CLOUDFLARE_TUNNEL_SECRET || '',
          accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
          routes: [],
        },
        ngrok: {
          authToken: process.env.NGROK_AUTH_TOKEN || '',
          region: process.env.NGROK_REGION as 'us' | 'eu' | 'ap' | undefined,
        },
        defaultProvider:
          (process.env.TUNNEL_PROVIDER as 'cloudflare' | 'ngrok') || 'cloudflare',
      }),
    tunnelsHealthCheck({
      ...getConfig('tunnels'),
      apiKey: process.env.CLOUDFLARE_API_TOKEN,
    }),
    {
      ...getConfig('tunnels'),
      apiKey: process.env.CLOUDFLARE_API_TOKEN,
    }
  );

  // Decorate fastify with integrations manager
  fastify.decorate('integrations', manager);

  // Initialize all integrations on startup if autoInit is enabled
  if (options.autoInit !== false) {
    fastify.addHook('onReady', async () => {
      await manager.initAll();
      const statuses = manager.getAllStatuses();
      const connected = statuses.filter((s) => s.connected).length;
      const enabled = statuses.filter((s) => s.enabled).length;
      fastify.log.info(
        `Integrations initialized: ${connected}/${enabled} connected`
      );
    });
  }
};

export default fp(integrationsPlugin, {
  name: 'integrations',
  fastify: '4.x',
});
