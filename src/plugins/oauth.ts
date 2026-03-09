/**
 * OAuth 2.0 Plugin
 * Authorization Code Flow with PKCE — RFC 7636
 * Uses Clerk as the upstream identity provider when configured;
 * falls back to a self-hosted JWT-based implementation otherwise.
 *
 * COMPLIANCE-SENSITIVE GATEWAY PATH
 */

import crypto from 'crypto';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

export interface OAuthClient {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
  scopes: string[];
  name: string;
}

export interface OAuthCode {
  code: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  userId?: string;
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
  expiresAt: number;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope: string;
  issuedAt: number;
}

interface OAuthState {
  clients: Map<string, OAuthClient>;
  codes: Map<string, OAuthCode>;
  tokens: Map<string, OAuthToken>;
}

const OAUTH_STATE: OAuthState = {
  clients: new Map(),
  codes: new Map(),
  tokens: new Map(),
};

async function oauthPlugin(fastify: FastifyInstance) {
  fastify.decorate('oauthState', OAUTH_STATE);

  // Register a built-in gateway client for internal use
  const gatewayClient: OAuthClient = {
    clientId: process.env.OAUTH_CLIENT_ID || 'blackroad-gateway',
    clientSecret: process.env.OAUTH_CLIENT_SECRET || 'change-me-in-production',
    redirectUris: (process.env.OAUTH_REDIRECT_URIS || 'http://localhost:4000/auth/callback').split(',').map((u) => u.trim()),
    scopes: ['openid', 'profile', 'email', 'gateway:read', 'gateway:write'],
    name: 'BlackRoad OS Gateway',
  };
  OAUTH_STATE.clients.set(gatewayClient.clientId, gatewayClient);

  /**
   * Issue a signed JWT access token for the given subject and scope.
   */
  fastify.decorate(
    'issueAccessToken',
    (subject: string, scope: string): OAuthToken => {
      const token = fastify.jwt.sign(
        { sub: subject, scope, iat: Math.floor(Date.now() / 1000) },
        { expiresIn: '1h' }
      );
      const refreshToken = crypto.randomBytes(32).toString('hex');
      const oauthToken: OAuthToken = {
        accessToken: token,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
        scope,
        issuedAt: Math.floor(Date.now() / 1000),
      };
      OAUTH_STATE.tokens.set(token, oauthToken);
      return oauthToken;
    }
  );

  /**
   * Verify a Bearer access token from the Authorization header.
   * Compatible with the existing verifyJWT hook.
   */
  fastify.decorate(
    'verifyOAuthToken',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify();
      } catch (err) {
        request.log.warn({ err }, 'OAuth token verification failed');
        reply.code(401).send({ error: 'invalid_token', error_description: 'The access token is invalid or expired' });
      }
    }
  );

  // Periodically clean up expired authorization codes
  setInterval(() => {
    const now = Date.now();
    for (const [key, code] of OAUTH_STATE.codes.entries()) {
      if (code.expiresAt < now) OAUTH_STATE.codes.delete(key);
    }
  }, 60_000);
}

declare module 'fastify' {
  interface FastifyInstance {
    oauthState: OAuthState;
    issueAccessToken(subject: string, scope: string): OAuthToken;
    verifyOAuthToken(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export default fp(oauthPlugin, {
  name: 'oauth-plugin',
  dependencies: ['auth-plugin'],
});
