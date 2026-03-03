/**
 * OAuth 2.0 Routes
 * Authorization Code Flow with PKCE — RFC 7636 / RFC 6749
 *
 * Endpoints:
 *   GET  /auth/authorize   — initiate authorization
 *   POST /auth/token       — exchange code for tokens
 *   GET  /auth/callback    — authorization server callback
 *   POST /auth/revoke      — revoke a token
 *   GET  /auth/userinfo    — fetch user info from a valid token
 *
 * COMPLIANCE-SENSITIVE GATEWAY PATH
 */

import crypto from 'crypto';

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { verifyPKCE } from '../utils/pkce';

const oauthRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /** GET /auth/authorize
   * Query params:
   *   response_type       (required) must be "code"
   *   client_id           (required)
   *   redirect_uri        (required)
   *   scope               (optional, space-separated)
   *   state               (recommended)
   *   code_challenge      (required for PKCE)
   *   code_challenge_method (required for PKCE — "S256")
   */
  fastify.get<{
    Querystring: {
      response_type: string;
      client_id: string;
      redirect_uri: string;
      scope?: string;
      state?: string;
      code_challenge?: string;
      code_challenge_method?: string;
    };
  }>('/auth/authorize', {
    schema: {
      description: 'Initiate OAuth 2.0 authorization code flow',
      tags: ['auth'],
      querystring: {
        type: 'object',
        required: ['response_type', 'client_id', 'redirect_uri'],
        properties: {
          response_type: { type: 'string', enum: ['code'] },
          client_id: { type: 'string' },
          redirect_uri: { type: 'string' },
          scope: { type: 'string' },
          state: { type: 'string' },
          code_challenge: { type: 'string' },
          code_challenge_method: { type: 'string', enum: ['S256', 'plain'] },
        },
      },
    },
    handler: async (request, reply) => {
      const { response_type, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method } =
        request.query;

      if (response_type !== 'code') {
        return reply.code(400).send({ error: 'unsupported_response_type' });
      }

      const client = fastify.oauthState.clients.get(client_id);
      if (!client) {
        return reply.code(400).send({ error: 'invalid_client', error_description: 'Unknown client_id' });
      }

      if (!client.redirectUris.includes(redirect_uri)) {
        return reply.code(400).send({ error: 'invalid_request', error_description: 'redirect_uri mismatch' });
      }

      // PKCE is required for public clients (recommended for all)
      if (!code_challenge) {
        return reply.code(400).send({
          error: 'invalid_request',
          error_description: 'code_challenge is required (PKCE)',
        });
      }

      const method = (code_challenge_method as 'S256' | 'plain') || 'S256';
      if (method !== 'S256') {
        return reply.code(400).send({
          error: 'invalid_request',
          error_description: 'code_challenge_method must be S256',
        });
      }

      // If Clerk is configured, redirect to Clerk's OAuth endpoint
      // Set CLERK_FRONTEND_API_URL to your Clerk Frontend API (e.g. https://accounts.example.clerk.accounts.dev)
      const clerkFrontendApiUrl = process.env.CLERK_FRONTEND_API_URL;
      if (clerkFrontendApiUrl) {
        const clerkOAuthUrl = new URL(`${clerkFrontendApiUrl}/oauth/authorize`);
        clerkOAuthUrl.searchParams.set('response_type', 'code');
        clerkOAuthUrl.searchParams.set('client_id', client_id);
        clerkOAuthUrl.searchParams.set('redirect_uri', redirect_uri);
        if (scope) clerkOAuthUrl.searchParams.set('scope', scope);
        if (state) clerkOAuthUrl.searchParams.set('state', state);
        if (code_challenge) clerkOAuthUrl.searchParams.set('code_challenge', code_challenge);
        clerkOAuthUrl.searchParams.set('code_challenge_method', method);
        return reply.redirect(302, clerkOAuthUrl.toString());
      }

      // Self-hosted: issue an authorization code immediately (for server-to-server flows)
      const code = crypto.randomBytes(32).toString('hex');
      fastify.oauthState.codes.set(code, {
        code,
        clientId: client_id,
        redirectUri: redirect_uri,
        scope: scope || 'openid profile',
        codeChallenge: code_challenge,
        codeChallengeMethod: method,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      });

      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', code);
      if (state) redirectUrl.searchParams.set('state', state);
      return reply.redirect(302, redirectUrl.toString());
    },
  });

  /** POST /auth/token
   * Body (application/x-www-form-urlencoded):
   *   grant_type      "authorization_code" | "refresh_token"
   *   code            (for authorization_code)
   *   redirect_uri    (for authorization_code)
   *   code_verifier   (for authorization_code + PKCE)
   *   client_id
   *   client_secret   (for confidential clients)
   *   refresh_token   (for refresh_token grant)
   */
  fastify.post<{
    Body: {
      grant_type: string;
      code?: string;
      redirect_uri?: string;
      code_verifier?: string;
      client_id: string;
      client_secret?: string;
      refresh_token?: string;
      scope?: string;
    };
  }>('/auth/token', {
    schema: {
      description: 'Exchange authorization code for tokens',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['grant_type', 'client_id'],
        properties: {
          grant_type: { type: 'string' },
          code: { type: 'string' },
          redirect_uri: { type: 'string' },
          code_verifier: { type: 'string' },
          client_id: { type: 'string' },
          client_secret: { type: 'string' },
          refresh_token: { type: 'string' },
          scope: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { grant_type, code, redirect_uri, code_verifier, client_id, client_secret, scope } = request.body;

      const client = fastify.oauthState.clients.get(client_id);
      if (!client) {
        return reply.code(401).send({ error: 'invalid_client' });
      }

      if (grant_type === 'authorization_code') {
        if (!code || !redirect_uri || !code_verifier) {
          return reply.code(400).send({
            error: 'invalid_request',
            error_description: 'code, redirect_uri and code_verifier are required',
          });
        }

        const storedCode = fastify.oauthState.codes.get(code);
        if (!storedCode) {
          return reply.code(400).send({ error: 'invalid_grant', error_description: 'Authorization code not found or expired' });
        }

        if (storedCode.expiresAt < Date.now()) {
          fastify.oauthState.codes.delete(code);
          return reply.code(400).send({ error: 'invalid_grant', error_description: 'Authorization code expired' });
        }

        if (storedCode.clientId !== client_id) {
          return reply.code(400).send({ error: 'invalid_grant', error_description: 'client_id mismatch' });
        }

        if (storedCode.redirectUri !== redirect_uri) {
          return reply.code(400).send({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
        }

        // Verify PKCE
        if (storedCode.codeChallenge) {
          const method = storedCode.codeChallengeMethod || 'S256';
          if (!verifyPKCE(code_verifier, storedCode.codeChallenge, method)) {
            return reply.code(400).send({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
          }
        }

        fastify.oauthState.codes.delete(code);

        const subject = storedCode.userId || client_id;
        const tokenScope = storedCode.scope || scope || 'openid profile';
        const token = fastify.issueAccessToken(subject, tokenScope);

        reply.header('Cache-Control', 'no-store');
        return {
          access_token: token.accessToken,
          token_type: token.tokenType,
          expires_in: token.expiresIn,
          refresh_token: token.refreshToken,
          scope: token.scope,
        };
      }

      if (grant_type === 'client_credentials') {
        // For server-to-server auth — validate client_secret
        if (!client_secret || client_secret !== client.clientSecret) {
          return reply.code(401).send({ error: 'invalid_client', error_description: 'Invalid client credentials' });
        }

        const tokenScope = scope || 'gateway:read gateway:write';
        const token = fastify.issueAccessToken(client_id, tokenScope);

        reply.header('Cache-Control', 'no-store');
        return {
          access_token: token.accessToken,
          token_type: token.tokenType,
          expires_in: token.expiresIn,
          scope: token.scope,
        };
      }

      return reply.code(400).send({ error: 'unsupported_grant_type' });
    },
  });

  /** GET /auth/callback — handles provider redirects */
  fastify.get<{
    Querystring: { code?: string; state?: string; error?: string; error_description?: string };
  }>('/auth/callback', {
    schema: {
      description: 'OAuth 2.0 authorization callback',
      tags: ['auth'],
    },
    handler: async (request, reply) => {
      const { code, state, error, error_description } = request.query;

      if (error) {
        request.log.warn({ error, error_description }, 'OAuth callback error from provider');
        return reply.code(400).send({ error, error_description });
      }

      if (!code) {
        return reply.code(400).send({ error: 'invalid_request', error_description: 'Missing code' });
      }

      // Return the code to the client — the actual token exchange happens client-side via /auth/token
      return { code, state, message: 'Exchange this code at POST /auth/token' };
    },
  });

  /** POST /auth/revoke — revoke an access token (RFC 7009) */
  fastify.post<{ Body: { token: string; client_id: string } }>('/auth/revoke', {
    schema: {
      description: 'Revoke an OAuth 2.0 token',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['token', 'client_id'],
        properties: {
          token: { type: 'string' },
          client_id: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const { token, client_id } = request.body;

      const client = fastify.oauthState.clients.get(client_id);
      if (!client) {
        return reply.code(401).send({ error: 'invalid_client' });
      }

      fastify.oauthState.tokens.delete(token);
      reply.code(200).send({});
    },
  });

  /** GET /auth/userinfo — RFC 7662-style userinfo from a valid token */
  fastify.get('/auth/userinfo', {
    schema: {
      description: 'Get user info from a valid access token',
      tags: ['auth'],
    },
    preHandler: fastify.verifyOAuthToken,
    handler: async (request) => {
      const payload = request.user as Record<string, unknown>;
      return {
        sub: payload.sub,
        scope: payload.scope,
        iat: payload.iat,
        iss: 'blackroad-os-gateway',
      };
    },
  });
};

export default fp(oauthRoute, {
  name: 'oauth-route',
  dependencies: ['oauth-plugin'],
});
