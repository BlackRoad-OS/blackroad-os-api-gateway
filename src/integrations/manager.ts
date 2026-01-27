/**
 * Integration Manager
 * Centralized manager for all platform integrations
 */

import type { FastifyInstance } from 'fastify';

export interface IntegrationConfig {
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  webhookSecret?: string;
  options?: Record<string, unknown>;
}

export interface IntegrationStatus {
  name: string;
  enabled: boolean;
  connected: boolean;
  lastHealthCheck?: Date;
  error?: string;
}

type IntegrationInitFn = (config: IntegrationConfig) => Promise<boolean>;
type IntegrationHealthFn = () => Promise<boolean>;

interface Integration {
  name: string;
  init: IntegrationInitFn;
  healthCheck: IntegrationHealthFn;
  config: IntegrationConfig;
}

export class IntegrationManager {
  private integrations: Map<string, Integration> = new Map();
  private statuses: Map<string, IntegrationStatus> = new Map();

  constructor(private app?: FastifyInstance) {}

  register(
    name: string,
    init: IntegrationInitFn,
    healthCheck: IntegrationHealthFn,
    config: IntegrationConfig
  ): void {
    this.integrations.set(name, { name, init, healthCheck, config });
    this.statuses.set(name, {
      name,
      enabled: config.enabled,
      connected: false,
    });
  }

  async initAll(): Promise<void> {
    for (const [name, integration] of this.integrations) {
      if (!integration.config.enabled) {
        this.app?.log.info(`Integration ${name} is disabled, skipping`);
        continue;
      }

      try {
        const connected = await integration.init(integration.config);
        this.statuses.set(name, {
          name,
          enabled: true,
          connected,
          lastHealthCheck: new Date(),
        });
        this.app?.log.info(`Integration ${name} initialized successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.statuses.set(name, {
          name,
          enabled: true,
          connected: false,
          error: errorMessage,
        });
        this.app?.log.error(`Integration ${name} failed to initialize: ${errorMessage}`);
      }
    }
  }

  async healthCheckAll(): Promise<IntegrationStatus[]> {
    const results: IntegrationStatus[] = [];

    for (const [name, integration] of this.integrations) {
      if (!integration.config.enabled) {
        results.push({ name, enabled: false, connected: false });
        continue;
      }

      try {
        const healthy = await integration.healthCheck();
        const status: IntegrationStatus = {
          name,
          enabled: true,
          connected: healthy,
          lastHealthCheck: new Date(),
        };
        this.statuses.set(name, status);
        results.push(status);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const status: IntegrationStatus = {
          name,
          enabled: true,
          connected: false,
          lastHealthCheck: new Date(),
          error: errorMessage,
        };
        this.statuses.set(name, status);
        results.push(status);
      }
    }

    return results;
  }

  getStatus(name: string): IntegrationStatus | undefined {
    return this.statuses.get(name);
  }

  getAllStatuses(): IntegrationStatus[] {
    return Array.from(this.statuses.values());
  }

  isConnected(name: string): boolean {
    return this.statuses.get(name)?.connected ?? false;
  }
}

// Singleton instance
let manager: IntegrationManager | null = null;

export function getIntegrationManager(app?: FastifyInstance): IntegrationManager {
  if (!manager) {
    manager = new IntegrationManager(app);
  }
  return manager;
}
