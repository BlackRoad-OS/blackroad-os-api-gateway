/**
 * Vercel Platform Integration
 * Deploy and manage Vercel projects
 */

import type { IntegrationConfig } from '../manager';

export interface VercelProject {
  id: string;
  name: string;
  framework?: string;
  latestDeployments?: VercelDeployment[];
}

export interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'QUEUED' | 'READY' | 'CANCELED';
  created: number;
  buildingAt?: number;
  ready?: number;
}

export interface VercelDomain {
  name: string;
  apexName: string;
  verified: boolean;
  projectId: string;
}

export interface VercelConfig extends IntegrationConfig {
  teamId?: string;
  projectId?: string;
}

const VERCEL_API_URL = 'https://api.vercel.com';

export class VercelIntegration {
  private apiToken: string;
  private teamId?: string;
  private config: VercelConfig;

  constructor(config: VercelConfig) {
    this.config = config;
    this.apiToken = config.apiKey || process.env.VERCEL_TOKEN || '';
    this.teamId = config.teamId || process.env.VERCEL_TEAM_ID;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = new URL(`${VERCEL_API_URL}${endpoint}`);
    if (this.teamId) {
      url.searchParams.set('teamId', this.teamId);
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Vercel API error: ${error.error?.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Projects
  async getProjects(): Promise<VercelProject[]> {
    const result = await this.request<{ projects: VercelProject[] }>('/v9/projects');
    return result.projects;
  }

  async getProject(projectId: string): Promise<VercelProject> {
    return this.request<VercelProject>(`/v9/projects/${projectId}`);
  }

  async createProject(name: string, framework?: string): Promise<VercelProject> {
    return this.request<VercelProject>('/v9/projects', {
      method: 'POST',
      body: JSON.stringify({ name, framework }),
    });
  }

  // Deployments
  async getDeployments(projectId?: string, limit = 20): Promise<VercelDeployment[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (projectId) params.set('projectId', projectId);

    const result = await this.request<{ deployments: VercelDeployment[] }>(
      `/v6/deployments?${params.toString()}`
    );
    return result.deployments;
  }

  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    return this.request<VercelDeployment>(`/v13/deployments/${deploymentId}`);
  }

  async createDeployment(
    projectId: string,
    files: Array<{ file: string; data: string }>,
    target?: 'production' | 'preview'
  ): Promise<VercelDeployment> {
    return this.request<VercelDeployment>('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: projectId,
        files,
        target: target || 'preview',
        projectSettings: {},
      }),
    });
  }

  async cancelDeployment(deploymentId: string): Promise<void> {
    await this.request(`/v12/deployments/${deploymentId}/cancel`, {
      method: 'PATCH',
    });
  }

  // Domains
  async getDomains(projectId: string): Promise<VercelDomain[]> {
    const result = await this.request<{ domains: VercelDomain[] }>(
      `/v9/projects/${projectId}/domains`
    );
    return result.domains;
  }

  async addDomain(projectId: string, domain: string): Promise<VercelDomain> {
    return this.request<VercelDomain>(`/v9/projects/${projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    });
  }

  async removeDomain(projectId: string, domain: string): Promise<void> {
    await this.request(`/v9/projects/${projectId}/domains/${domain}`, {
      method: 'DELETE',
    });
  }

  // Environment Variables
  async getEnvVars(projectId: string): Promise<Array<{ key: string; value: string; target: string[] }>> {
    const result = await this.request<{ envs: Array<{ key: string; value: string; target: string[] }> }>(
      `/v9/projects/${projectId}/env`
    );
    return result.envs;
  }

  async setEnvVar(
    projectId: string,
    key: string,
    value: string,
    target: ('production' | 'preview' | 'development')[] = ['production', 'preview']
  ): Promise<void> {
    await this.request(`/v10/projects/${projectId}/env`, {
      method: 'POST',
      body: JSON.stringify({ key, value, target, type: 'encrypted' }),
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const projects = await this.getProjects();
      return projects.length >= 0;
    } catch {
      return false;
    }
  }
}

export async function initVercel(config: VercelConfig): Promise<boolean> {
  const vercel = new VercelIntegration(config);
  return vercel.healthCheck();
}

export function vercelHealthCheck(config: VercelConfig): () => Promise<boolean> {
  const vercel = new VercelIntegration(config);
  return () => vercel.healthCheck();
}
