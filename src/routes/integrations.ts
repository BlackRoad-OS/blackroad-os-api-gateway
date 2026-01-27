/**
 * Integrations Routes
 * API routes for managing and querying integrations
 */

import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const integrationsRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get all integration statuses
  fastify.get('/integrations', {
    schema: {
      description: 'Get status of all platform integrations',
      tags: ['integrations'],
      response: {
        200: {
          type: 'object',
          properties: {
            integrations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  enabled: { type: 'boolean' },
                  connected: { type: 'boolean' },
                  lastHealthCheck: { type: 'string', format: 'date-time' },
                  error: { type: 'string' },
                },
              },
            },
            summary: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                enabled: { type: 'number' },
                connected: { type: 'number' },
              },
            },
          },
        },
      },
    },
    handler: async () => {
      const statuses = fastify.integrations.getAllStatuses();

      return {
        integrations: statuses.map((s) => ({
          ...s,
          lastHealthCheck: s.lastHealthCheck?.toISOString(),
        })),
        summary: {
          total: statuses.length,
          enabled: statuses.filter((s) => s.enabled).length,
          connected: statuses.filter((s) => s.connected).length,
        },
      };
    },
  });

  // Get specific integration status
  fastify.get<{ Params: { name: string } }>('/integrations/:name', {
    schema: {
      description: 'Get status of a specific integration',
      tags: ['integrations'],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            enabled: { type: 'boolean' },
            connected: { type: 'boolean' },
            lastHealthCheck: { type: 'string', format: 'date-time' },
            error: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const { name } = request.params;
      const status = fastify.integrations.getStatus(name);

      if (!status) {
        return reply.status(404).send({ error: `Integration '${name}' not found` });
      }

      return {
        ...status,
        lastHealthCheck: status.lastHealthCheck?.toISOString(),
      };
    },
  });

  // Trigger health check for all integrations
  fastify.post('/integrations/health-check', {
    schema: {
      description: 'Trigger health check for all integrations',
      tags: ['integrations'],
      response: {
        200: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  enabled: { type: 'boolean' },
                  connected: { type: 'boolean' },
                  lastHealthCheck: { type: 'string', format: 'date-time' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    handler: async () => {
      const results = await fastify.integrations.healthCheckAll();

      return {
        results: results.map((r) => ({
          ...r,
          lastHealthCheck: r.lastHealthCheck?.toISOString(),
        })),
      };
    },
  });

  // Get available platforms
  fastify.get('/integrations/platforms', {
    schema: {
      description: 'Get list of available deployment platforms',
      tags: ['integrations'],
    },
    handler: async () => {
      const platformNames = [
        'railway',
        'cloudflare',
        'vercel',
        'digitalocean',
        'docker',
      ];

      const platforms = platformNames.map((name) => ({
        name,
        status: fastify.integrations.getStatus(name),
      }));

      return { platforms };
    },
  });

  // Get available tools
  fastify.get('/integrations/tools', {
    schema: {
      description: 'Get list of available development tools',
      tags: ['integrations'],
    },
    handler: async () => {
      const toolNames = ['warp', 'shellfish', 'working-copy', 'pyto'];

      const tools = toolNames.map((name) => ({
        name,
        status: fastify.integrations.getStatus(name),
      }));

      return { tools };
    },
  });

  // Get available AI models
  fastify.get('/integrations/ai/models', {
    schema: {
      description: 'Get list of available AI models from the OSS registry',
      tags: ['integrations', 'ai'],
    },
    handler: async () => {
      // Import the OSS models registry dynamically
      const { OSS_MODELS_REGISTRY } = await import('../integrations/ai/oss-models');

      return {
        models: OSS_MODELS_REGISTRY.map((model) => ({
          id: model.id,
          name: model.name,
          provider: model.provider,
          type: model.type,
          parameters: model.parameters,
          license: model.license,
          recommended: model.recommended,
          safetyScore: model.safetyAudit.score,
          tags: model.tags,
        })),
        total: OSS_MODELS_REGISTRY.length,
        recommended: OSS_MODELS_REGISTRY.filter((m) => m.recommended).length,
        securityAudited: OSS_MODELS_REGISTRY.filter((m) => m.safetyAudit.audited).length,
      };
    },
  });

  // Get specific AI model details
  fastify.get<{ Params: { modelId: string } }>('/integrations/ai/models/:modelId', {
    schema: {
      description: 'Get details of a specific AI model',
      tags: ['integrations', 'ai'],
      params: {
        type: 'object',
        properties: {
          modelId: { type: 'string' },
        },
        required: ['modelId'],
      },
    },
    handler: async (request, reply) => {
      const { modelId } = request.params;
      const { OSS_MODELS_REGISTRY } = await import('../integrations/ai/oss-models');

      const model = OSS_MODELS_REGISTRY.find((m) => m.id === modelId);

      if (!model) {
        return reply.status(404).send({ error: `Model '${modelId}' not found` });
      }

      return { model };
    },
  });

  // Get forked models
  fastify.get('/integrations/ai/models/forked', {
    schema: {
      description: 'Get list of BlackRoad forked models with security audits',
      tags: ['integrations', 'ai'],
    },
    handler: async () => {
      const { OSS_MODELS_REGISTRY } = await import('../integrations/ai/oss-models');

      const forkedModels = OSS_MODELS_REGISTRY.filter((m) => m.fork);

      return {
        models: forkedModels,
        total: forkedModels.length,
      };
    },
  });
};

export default fp(integrationsRoute, {
  name: 'integrations-route',
  fastify: '4.x',
  dependencies: ['integrations'],
});
