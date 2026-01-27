/**
 * Docker Platform Integration
 * Manage Docker containers, images, and registries
 */

import type { IntegrationConfig } from '../manager';

export interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: string;
  Status: string;
  Ports: Array<{
    IP?: string;
    PrivatePort: number;
    PublicPort?: number;
    Type: string;
  }>;
  Labels: Record<string, string>;
}

export interface DockerImage {
  Id: string;
  RepoTags: string[];
  RepoDigests: string[];
  Created: number;
  Size: number;
  Labels: Record<string, string>;
}

export interface DockerNetwork {
  Id: string;
  Name: string;
  Driver: string;
  Scope: string;
  IPAM: {
    Config: Array<{ Subnet: string; Gateway: string }>;
  };
}

export interface DockerVolume {
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt: string;
  Labels: Record<string, string>;
}

export interface DockerConfig extends IntegrationConfig {
  socketPath?: string;
  host?: string;
  port?: number;
  registryUrl?: string;
  registryUsername?: string;
  registryPassword?: string;
}

export class DockerIntegration {
  private config: DockerConfig;
  private baseUrl: string;

  constructor(config: DockerConfig) {
    this.config = config;
    // Default to Docker socket, but support TCP connections
    if (config.host) {
      const port = config.port || 2375;
      this.baseUrl = `http://${config.host}:${port}`;
    } else {
      // For socket connections, we'd need a different approach
      // This assumes a TCP connection or Docker Desktop REST API
      this.baseUrl = config.baseUrl || 'http://localhost:2375';
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Docker API error: ${error.message || response.statusText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  // Containers
  async listContainers(all = false): Promise<DockerContainer[]> {
    return this.request<DockerContainer[]>(`/containers/json?all=${all}`);
  }

  async getContainer(containerId: string): Promise<DockerContainer> {
    return this.request<DockerContainer>(`/containers/${containerId}/json`);
  }

  async createContainer(
    name: string,
    image: string,
    options: {
      Env?: string[];
      Cmd?: string[];
      ExposedPorts?: Record<string, object>;
      HostConfig?: {
        PortBindings?: Record<string, Array<{ HostPort: string }>>;
        Binds?: string[];
        RestartPolicy?: { Name: string; MaximumRetryCount?: number };
      };
      Labels?: Record<string, string>;
    } = {}
  ): Promise<{ Id: string; Warnings: string[] }> {
    return this.request(`/containers/create?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      body: JSON.stringify({ Image: image, ...options }),
    });
  }

  async startContainer(containerId: string): Promise<void> {
    await this.request(`/containers/${containerId}/start`, { method: 'POST' });
  }

  async stopContainer(containerId: string, timeout = 10): Promise<void> {
    await this.request(`/containers/${containerId}/stop?t=${timeout}`, { method: 'POST' });
  }

  async restartContainer(containerId: string, timeout = 10): Promise<void> {
    await this.request(`/containers/${containerId}/restart?t=${timeout}`, { method: 'POST' });
  }

  async removeContainer(containerId: string, force = false): Promise<void> {
    await this.request(`/containers/${containerId}?force=${force}`, { method: 'DELETE' });
  }

  async getContainerLogs(containerId: string, tail = 100): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/containers/${containerId}/logs?stdout=true&stderr=true&tail=${tail}`
    );
    return response.text();
  }

  async execInContainer(containerId: string, cmd: string[]): Promise<{ Id: string }> {
    const execCreate = await this.request<{ Id: string }>(`/containers/${containerId}/exec`, {
      method: 'POST',
      body: JSON.stringify({
        AttachStdout: true,
        AttachStderr: true,
        Cmd: cmd,
      }),
    });
    return execCreate;
  }

  // Images
  async listImages(): Promise<DockerImage[]> {
    return this.request<DockerImage[]>('/images/json');
  }

  async pullImage(image: string, tag = 'latest'): Promise<void> {
    await this.request(`/images/create?fromImage=${encodeURIComponent(image)}&tag=${tag}`, {
      method: 'POST',
    });
  }

  async removeImage(imageId: string, force = false): Promise<void> {
    await this.request(`/images/${imageId}?force=${force}`, { method: 'DELETE' });
  }

  async tagImage(imageId: string, repo: string, tag: string): Promise<void> {
    await this.request(`/images/${imageId}/tag?repo=${encodeURIComponent(repo)}&tag=${tag}`, {
      method: 'POST',
    });
  }

  async pushImage(image: string, tag = 'latest'): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.config.registryUsername && this.config.registryPassword) {
      const auth = Buffer.from(
        JSON.stringify({
          username: this.config.registryUsername,
          password: this.config.registryPassword,
        })
      ).toString('base64');
      headers['X-Registry-Auth'] = auth;
    }
    await this.request(`/images/${encodeURIComponent(image)}/push?tag=${tag}`, {
      method: 'POST',
      headers,
    });
  }

  // Networks
  async listNetworks(): Promise<DockerNetwork[]> {
    return this.request<DockerNetwork[]>('/networks');
  }

  async createNetwork(name: string, driver = 'bridge'): Promise<{ Id: string }> {
    return this.request('/networks/create', {
      method: 'POST',
      body: JSON.stringify({ Name: name, Driver: driver }),
    });
  }

  async removeNetwork(networkId: string): Promise<void> {
    await this.request(`/networks/${networkId}`, { method: 'DELETE' });
  }

  async connectContainer(networkId: string, containerId: string): Promise<void> {
    await this.request(`/networks/${networkId}/connect`, {
      method: 'POST',
      body: JSON.stringify({ Container: containerId }),
    });
  }

  // Volumes
  async listVolumes(): Promise<DockerVolume[]> {
    const result = await this.request<{ Volumes: DockerVolume[] }>('/volumes');
    return result.Volumes || [];
  }

  async createVolume(name: string, labels?: Record<string, string>): Promise<DockerVolume> {
    return this.request('/volumes/create', {
      method: 'POST',
      body: JSON.stringify({ Name: name, Labels: labels }),
    });
  }

  async removeVolume(volumeName: string): Promise<void> {
    await this.request(`/volumes/${volumeName}`, { method: 'DELETE' });
  }

  // System
  async getInfo(): Promise<{
    Containers: number;
    ContainersRunning: number;
    Images: number;
    DockerRootDir: string;
    ServerVersion: string;
  }> {
    return this.request('/info');
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/_ping`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    return this.ping();
  }
}

export async function initDocker(config: DockerConfig): Promise<boolean> {
  const docker = new DockerIntegration(config);
  return docker.healthCheck();
}

export function dockerHealthCheck(config: DockerConfig): () => Promise<boolean> {
  const docker = new DockerIntegration(config);
  return () => docker.healthCheck();
}
