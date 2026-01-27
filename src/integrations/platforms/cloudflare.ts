/**
 * Cloudflare Platform Integration
 * Manage Pages, Workers, DNS, and Tunnels
 */

import type { IntegrationConfig } from '../manager';

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  paused: boolean;
}

export interface CloudflarePage {
  id: string;
  name: string;
  subdomain: string;
  domains: string[];
  production_branch: string;
}

export interface CloudflareWorker {
  id: string;
  name: string;
  created_on: string;
  modified_on: string;
}

export interface CloudflareTunnel {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'degraded';
  created_at: string;
  connections: CloudflareTunnelConnection[];
}

export interface CloudflareTunnelConnection {
  id: string;
  client_id: string;
  origin_ip: string;
  opened_at: string;
}

export interface CloudflareConfig extends IntegrationConfig {
  accountId?: string;
  zoneId?: string;
}

const CF_API_URL = 'https://api.cloudflare.com/client/v4';

export class CloudflareIntegration {
  private apiToken: string;
  private accountId: string;
  private config: CloudflareConfig;

  constructor(config: CloudflareConfig) {
    this.config = config;
    this.apiToken = config.apiKey || process.env.CLOUDFLARE_API_TOKEN || '';
    this.accountId = config.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || '';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${CF_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!data.success) {
      const error = data.errors?.[0]?.message || 'Unknown Cloudflare error';
      throw new Error(`Cloudflare API error: ${error}`);
    }

    return data.result as T;
  }

  // Zones
  async getZones(): Promise<CloudflareZone[]> {
    return this.request<CloudflareZone[]>('/zones');
  }

  async getZone(zoneId: string): Promise<CloudflareZone> {
    return this.request<CloudflareZone>(`/zones/${zoneId}`);
  }

  // Pages
  async getPages(): Promise<CloudflarePage[]> {
    return this.request<CloudflarePage[]>(`/accounts/${this.accountId}/pages/projects`);
  }

  async createPagesDeployment(projectName: string, branch: string): Promise<{ id: string; url: string }> {
    return this.request<{ id: string; url: string }>(
      `/accounts/${this.accountId}/pages/projects/${projectName}/deployments`,
      {
        method: 'POST',
        body: JSON.stringify({ branch }),
      }
    );
  }

  // Workers
  async getWorkers(): Promise<CloudflareWorker[]> {
    const result = await this.request<{ result: CloudflareWorker[] }>(
      `/accounts/${this.accountId}/workers/scripts`
    );
    return Array.isArray(result) ? result : [];
  }

  async deployWorker(name: string, script: string): Promise<CloudflareWorker> {
    return this.request<CloudflareWorker>(
      `/accounts/${this.accountId}/workers/scripts/${name}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/javascript',
        },
        body: script,
      }
    );
  }

  // Tunnels
  async getTunnels(): Promise<CloudflareTunnel[]> {
    return this.request<CloudflareTunnel[]>(`/accounts/${this.accountId}/cfd_tunnel`);
  }

  async getTunnel(tunnelId: string): Promise<CloudflareTunnel> {
    return this.request<CloudflareTunnel>(`/accounts/${this.accountId}/cfd_tunnel/${tunnelId}`);
  }

  async createTunnel(name: string, tunnelSecret: string): Promise<CloudflareTunnel> {
    return this.request<CloudflareTunnel>(`/accounts/${this.accountId}/cfd_tunnel`, {
      method: 'POST',
      body: JSON.stringify({ name, tunnel_secret: tunnelSecret }),
    });
  }

  async deleteTunnel(tunnelId: string): Promise<void> {
    await this.request(`/accounts/${this.accountId}/cfd_tunnel/${tunnelId}`, {
      method: 'DELETE',
    });
  }

  // DNS Records
  async getDNSRecords(zoneId: string): Promise<Array<{ id: string; name: string; type: string; content: string }>> {
    return this.request(`/zones/${zoneId}/dns_records`);
  }

  async createDNSRecord(
    zoneId: string,
    record: { type: string; name: string; content: string; ttl?: number; proxied?: boolean }
  ): Promise<{ id: string }> {
    return this.request(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(record),
    });
  }

  // Purge Cache
  async purgeCache(zoneId: string, urls?: string[]): Promise<{ id: string }> {
    const body = urls ? { files: urls } : { purge_everything: true };
    return this.request(`/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const zones = await this.getZones();
      return zones.length >= 0;
    } catch {
      return false;
    }
  }
}

export async function initCloudflare(config: CloudflareConfig): Promise<boolean> {
  const cf = new CloudflareIntegration(config);
  return cf.healthCheck();
}

export function cloudflareHealthCheck(config: CloudflareConfig): () => Promise<boolean> {
  const cf = new CloudflareIntegration(config);
  return () => cf.healthCheck();
}
