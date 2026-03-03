/**
 * Contributor Access / Converter API
 *
 * BlackRoad OS, Inc. — Proprietary
 *
 * All contributors and AI agents MUST obtain a gateway access token through
 * this endpoint before they can read or write to any BlackRoad OS service.
 *
 * Enforcement rules:
 *  - No access without a valid contributor key.
 *  - AI agents (Codex, Copilot, Anthropic, OpenAI, etc.) are blocked unless
 *    they present a token issued by this endpoint.
 *  - Only @blackboxprogramming and @lucidia are pre-approved contributors.
 *
 * COMPLIANCE-SENSITIVE GATEWAY PATH
 */

import crypto from 'crypto';

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

interface ContributorRequest {
  githubHandle: string;
  purpose: string;
  agentType?: 'human' | 'ai';
  agentName?: string;
}

/** Agent user-agent substrings that are explicitly blocked */
const BLOCKED_AGENTS = [
  'openai',
  'anthropic',
  'codex',
  'copilot',
  'github-copilot',
  'chatgpt',
  'claude',
  'gpt-',
  'text-davinci',
];

/** Approved contributor GitHub handles */
const PRE_APPROVED_CONTRIBUTORS = new Set(['blackboxprogramming', 'lucidia']);

/** In-memory key store — replace with persistent storage in production */
const CONTRIBUTOR_KEYS: Map<string, { githubHandle: string; issuedAt: number; expiresAt: number }> = new Map();

const accessRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * POST /access/request
   * Request a contributor access key. Human contributors are granted a key
   * immediately if their GitHub handle is pre-approved; otherwise the request
   * is logged and returns a pending response for manual review.
   * AI agents that are not @blackboxprogramming or @lucidia are rejected.
   */
  fastify.post<{ Body: ContributorRequest }>('/access/request', {
    schema: {
      description: 'Request a contributor access key for BlackRoad OS Gateway',
      tags: ['access'],
      body: {
        type: 'object',
        required: ['githubHandle', 'purpose'],
        properties: {
          githubHandle: { type: 'string', description: 'Your GitHub username' },
          purpose: { type: 'string', description: 'Why you need access' },
          agentType: { type: 'string', enum: ['human', 'ai'], default: 'human' },
          agentName: { type: 'string', description: 'Name of AI agent, if applicable' },
        },
      },
    },
    handler: async (request, reply) => {
      const { githubHandle, purpose, agentType, agentName } = request.body;
      const ua = (request.headers['user-agent'] || '').toLowerCase();

      // Block known third-party AI agents by user-agent header
      const isBlockedAgent = BLOCKED_AGENTS.some((pattern) => ua.includes(pattern));
      if (isBlockedAgent) {
        request.log.warn({ ua, githubHandle }, 'Blocked AI agent attempted access request');
        return reply.code(403).send({
          error: 'forbidden',
          error_description:
            'Third-party AI agents (OpenAI, Anthropic, Copilot, Codex, etc.) are not permitted. ' +
            'Only @blackboxprogramming and @lucidia are authorised AI contributors.',
        });
      }

      // Block AI agents that are not pre-approved
      if (agentType === 'ai') {
        if (!PRE_APPROVED_CONTRIBUTORS.has(githubHandle.toLowerCase())) {
          request.log.warn({ githubHandle, agentName }, 'Unauthorized AI agent access request');
          return reply.code(403).send({
            error: 'forbidden',
            error_description: `AI agent '${agentName || githubHandle}' is not an approved contributor. Only @blackboxprogramming and @lucidia are authorised.`,
          });
        }
      }

      const handle = githubHandle.toLowerCase();
      const isApproved = PRE_APPROVED_CONTRIBUTORS.has(handle);

      if (!isApproved) {
        request.log.info({ githubHandle, purpose }, 'New contributor access request (pending review)');
        return reply.code(202).send({
          status: 'pending',
          message:
            'Your request has been received and is pending manual review by the BlackRoad OS team. ' +
            'You will be contacted via GitHub once approved.',
          githubHandle,
        });
      }

      // Issue a contributor key valid for 90 days
      const key = `brk_${crypto.randomBytes(24).toString('hex')}`;
      const now = Date.now();
      CONTRIBUTOR_KEYS.set(key, {
        githubHandle: handle,
        issuedAt: now,
        expiresAt: now + 90 * 24 * 60 * 60 * 1000,
      });

      request.log.info({ githubHandle }, 'Contributor access key issued');
      return reply.code(201).send({
        status: 'approved',
        accessKey: key,
        expiresAt: new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(),
        instructions:
          'Include this key in all API requests as the `x-blackroad-access-key` header. ' +
          'Keep it secret — treat it like a password.',
      });
    },
  });

  /**
   * GET /access/validate
   * Validate a contributor access key.
   */
  fastify.get('/access/validate', {
    schema: {
      description: 'Validate a contributor access key',
      tags: ['access'],
      headers: {
        type: 'object',
        properties: {
          'x-blackroad-access-key': { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const key = request.headers['x-blackroad-access-key'];
      if (!key || typeof key !== 'string') {
        return reply.code(401).send({ error: 'missing_key', error_description: 'Provide your access key in the x-blackroad-access-key header' });
      }

      const record = CONTRIBUTOR_KEYS.get(key);
      if (!record) {
        return reply.code(401).send({ error: 'invalid_key', error_description: 'Access key not found or revoked' });
      }

      if (record.expiresAt < Date.now()) {
        CONTRIBUTOR_KEYS.delete(key);
        return reply.code(401).send({ error: 'expired_key', error_description: 'Access key has expired. Request a new key at POST /access/request' });
      }

      return {
        valid: true,
        githubHandle: record.githubHandle,
        issuedAt: new Date(record.issuedAt).toISOString(),
        expiresAt: new Date(record.expiresAt).toISOString(),
      };
    },
  });

  /**
   * DELETE /access/revoke
   * Revoke a contributor access key.
   */
  fastify.delete('/access/revoke', {
    schema: {
      description: 'Revoke a contributor access key',
      tags: ['access'],
      headers: {
        type: 'object',
        properties: {
          'x-blackroad-access-key': { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const key = request.headers['x-blackroad-access-key'];
      if (!key || typeof key !== 'string') {
        return reply.code(401).send({ error: 'missing_key' });
      }

      CONTRIBUTOR_KEYS.delete(key);
      request.log.info('Contributor access key revoked');
      return reply.code(204).send();
    },
  });
};

export default fp(accessRoute, {
  name: 'access-route',
  fastify: '4.x',
});
