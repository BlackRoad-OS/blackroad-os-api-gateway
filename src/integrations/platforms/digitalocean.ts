/**
 * DigitalOcean Platform Integration
 * Manage Droplets, App Platform, and Kubernetes
 */

import type { IntegrationConfig } from '../manager';

export interface DODroplet {
  id: number;
  name: string;
  status: 'new' | 'active' | 'off' | 'archive';
  memory: number;
  vcpus: number;
  disk: number;
  region: { slug: string; name: string };
  image: { id: number; name: string; slug: string };
  networks: {
    v4: Array<{ ip_address: string; type: 'public' | 'private' }>;
    v6: Array<{ ip_address: string; type: 'public' | 'private' }>;
  };
  created_at: string;
  tags: string[];
}

export interface DOApp {
  id: string;
  owner_uuid: string;
  spec: DOAppSpec;
  default_ingress: string;
  created_at: string;
  updated_at: string;
  active_deployment: DODeployment;
}

export interface DOAppSpec {
  name: string;
  region: string;
  services?: DOServiceSpec[];
  workers?: DOWorkerSpec[];
  jobs?: DOJobSpec[];
  databases?: DODatabaseSpec[];
}

export interface DOServiceSpec {
  name: string;
  git?: { repo_clone_url: string; branch: string };
  dockerfile_path?: string;
  http_port?: number;
  instance_count?: number;
  instance_size_slug?: string;
}

export interface DOWorkerSpec {
  name: string;
  git?: { repo_clone_url: string; branch: string };
  instance_count?: number;
}

export interface DOJobSpec {
  name: string;
  kind: 'PRE_DEPLOY' | 'POST_DEPLOY' | 'FAILED_DEPLOY';
}

export interface DODatabaseSpec {
  name: string;
  engine: 'PG' | 'MYSQL' | 'REDIS' | 'MONGODB';
  production?: boolean;
}

export interface DODeployment {
  id: string;
  phase: 'PENDING_BUILD' | 'BUILDING' | 'PENDING_DEPLOY' | 'DEPLOYING' | 'ACTIVE' | 'SUPERSEDED' | 'ERROR';
  created_at: string;
}

export interface DOConfig extends IntegrationConfig {
  defaultRegion?: string;
  sshKeyFingerprint?: string;
}

const DO_API_URL = 'https://api.digitalocean.com/v2';

export class DigitalOceanIntegration {
  private apiToken: string;
  private config: DOConfig;

  constructor(config: DOConfig) {
    this.config = config;
    this.apiToken = config.apiKey || process.env.DIGITALOCEAN_TOKEN || '';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${DO_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`DigitalOcean API error: ${error.message || response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  // Droplets
  async getDroplets(tag?: string): Promise<DODroplet[]> {
    const params = tag ? `?tag_name=${encodeURIComponent(tag)}` : '';
    const result = await this.request<{ droplets: DODroplet[] }>(`/droplets${params}`);
    return result.droplets;
  }

  async getDroplet(dropletId: number): Promise<DODroplet> {
    const result = await this.request<{ droplet: DODroplet }>(`/droplets/${dropletId}`);
    return result.droplet;
  }

  async createDroplet(options: {
    name: string;
    region: string;
    size: string;
    image: string | number;
    ssh_keys?: (string | number)[];
    user_data?: string;
    tags?: string[];
  }): Promise<DODroplet> {
    const result = await this.request<{ droplet: DODroplet }>('/droplets', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    return result.droplet;
  }

  async deleteDroplet(dropletId: number): Promise<void> {
    await this.request(`/droplets/${dropletId}`, { method: 'DELETE' });
  }

  async rebootDroplet(dropletId: number): Promise<void> {
    await this.request(`/droplets/${dropletId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ type: 'reboot' }),
    });
  }

  async powerOffDroplet(dropletId: number): Promise<void> {
    await this.request(`/droplets/${dropletId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ type: 'power_off' }),
    });
  }

  async powerOnDroplet(dropletId: number): Promise<void> {
    await this.request(`/droplets/${dropletId}/actions`, {
      method: 'POST',
      body: JSON.stringify({ type: 'power_on' }),
    });
  }

  // App Platform
  async getApps(): Promise<DOApp[]> {
    const result = await this.request<{ apps: DOApp[] }>('/apps');
    return result.apps;
  }

  async getApp(appId: string): Promise<DOApp> {
    const result = await this.request<{ app: DOApp }>(`/apps/${appId}`);
    return result.app;
  }

  async createApp(spec: DOAppSpec): Promise<DOApp> {
    const result = await this.request<{ app: DOApp }>('/apps', {
      method: 'POST',
      body: JSON.stringify({ spec }),
    });
    return result.app;
  }

  async updateApp(appId: string, spec: DOAppSpec): Promise<DOApp> {
    const result = await this.request<{ app: DOApp }>(`/apps/${appId}`, {
      method: 'PUT',
      body: JSON.stringify({ spec }),
    });
    return result.app;
  }

  async deleteApp(appId: string): Promise<void> {
    await this.request(`/apps/${appId}`, { method: 'DELETE' });
  }

  async createAppDeployment(appId: string, forceBuild = false): Promise<DODeployment> {
    const result = await this.request<{ deployment: DODeployment }>(`/apps/${appId}/deployments`, {
      method: 'POST',
      body: JSON.stringify({ force_build: forceBuild }),
    });
    return result.deployment;
  }

  // SSH Keys
  async getSSHKeys(): Promise<Array<{ id: number; name: string; fingerprint: string }>> {
    const result = await this.request<{ ssh_keys: Array<{ id: number; name: string; fingerprint: string }> }>(
      '/account/keys'
    );
    return result.ssh_keys;
  }

  async addSSHKey(name: string, publicKey: string): Promise<{ id: number; fingerprint: string }> {
    const result = await this.request<{ ssh_key: { id: number; fingerprint: string } }>('/account/keys', {
      method: 'POST',
      body: JSON.stringify({ name, public_key: publicKey }),
    });
    return result.ssh_key;
  }

  // Regions & Sizes
  async getRegions(): Promise<Array<{ slug: string; name: string; available: boolean }>> {
    const result = await this.request<{ regions: Array<{ slug: string; name: string; available: boolean }> }>(
      '/regions'
    );
    return result.regions;
  }

  async getSizes(): Promise<Array<{ slug: string; memory: number; vcpus: number; disk: number; price_monthly: number }>> {
    const result = await this.request<{
      sizes: Array<{ slug: string; memory: number; vcpus: number; disk: number; price_monthly: number }>;
    }>('/sizes');
    return result.sizes;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.request<{ account: { status: string } }>('/account');
      return result.account.status === 'active';
    } catch {
      return false;
    }
  }
}

export async function initDigitalOcean(config: DOConfig): Promise<boolean> {
  const doClient = new DigitalOceanIntegration(config);
  return doClient.healthCheck();
}

export function digitalOceanHealthCheck(config: DOConfig): () => Promise<boolean> {
  const doClient = new DigitalOceanIntegration(config);
  return () => doClient.healthCheck();
}
