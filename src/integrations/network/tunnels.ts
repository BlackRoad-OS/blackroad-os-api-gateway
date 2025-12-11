/**
 * Tunneling Integration
 * Support for Cloudflare Tunnels, ngrok, and other tunneling services
 * Secure exposure of local services
 */

import type { IntegrationConfig } from '../manager';

export interface Tunnel {
  id: string;
  name: string;
  provider: 'cloudflare' | 'ngrok' | 'localtunnel' | 'custom';
  status: 'active' | 'inactive' | 'error' | 'pending';
  publicUrl: string;
  localPort: number;
  localHost: string;
  protocol: 'http' | 'https' | 'tcp' | 'ssh';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface CloudflareTunnelConfig {
  tunnelId: string;
  tunnelSecret: string;
  accountId: string;
  routes: Array<{
    hostname: string;
    service: string;
    path?: string;
  }>;
}

export interface NgrokConfig {
  authToken: string;
  region?: 'us' | 'eu' | 'ap' | 'au' | 'sa' | 'jp' | 'in';
  domain?: string;
}

export interface TunnelConfig extends IntegrationConfig {
  cloudflare?: CloudflareTunnelConfig;
  ngrok?: NgrokConfig;
  defaultProvider?: 'cloudflare' | 'ngrok';
}

const CLOUDFLARE_API_URL = 'https://api.cloudflare.com/client/v4';
const NGROK_API_URL = 'https://api.ngrok.com';

export class TunnelIntegration {
  private config: TunnelConfig;
  private tunnels: Map<string, Tunnel> = new Map();

  constructor(config: TunnelConfig) {
    this.config = config;
    this.initializeDefaultTunnels();
  }

  private initializeDefaultTunnels(): void {
    // Pre-configure common BlackRoad OS tunnel endpoints
    const defaultTunnels: Tunnel[] = [
      {
        id: 'gateway-dev',
        name: 'API Gateway (Development)',
        provider: 'cloudflare',
        status: 'inactive',
        publicUrl: 'https://dev-gateway.blackroad.io',
        localPort: 4000,
        localHost: 'localhost',
        protocol: 'https',
        createdAt: new Date().toISOString(),
        metadata: { service: 'api-gateway', environment: 'development' },
      },
      {
        id: 'beacon-dev',
        name: 'Beacon Service (Development)',
        provider: 'cloudflare',
        status: 'inactive',
        publicUrl: 'https://dev-beacon.blackroad.io',
        localPort: 5000,
        localHost: 'localhost',
        protocol: 'https',
        createdAt: new Date().toISOString(),
        metadata: { service: 'beacon', environment: 'development' },
      },
      {
        id: 'ssh-tunnel',
        name: 'SSH Tunnel',
        provider: 'cloudflare',
        status: 'inactive',
        publicUrl: 'ssh.blackroad.io',
        localPort: 22,
        localHost: 'localhost',
        protocol: 'ssh',
        createdAt: new Date().toISOString(),
        metadata: { service: 'ssh', secure: true },
      },
    ];

    for (const tunnel of defaultTunnels) {
      this.tunnels.set(tunnel.id, tunnel);
    }
  }

  // Cloudflare Tunnels
  private async cloudflareRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.config.apiKey) {
      throw new Error('Cloudflare API token not configured');
    }

    const response = await fetch(`${CLOUDFLARE_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(`Cloudflare API error: ${data.errors?.[0]?.message || response.statusText}`);
    }

    return data.result as T;
  }

  async createCloudflareTunnel(name: string): Promise<{ id: string; token: string }> {
    if (!this.config.cloudflare?.accountId) {
      throw new Error('Cloudflare account ID not configured');
    }

    // Generate a random tunnel secret
    const tunnelSecret = Buffer.from(
      Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
    ).toString('base64');

    const result = await this.cloudflareRequest<{
      id: string;
      name: string;
      credentials_file: { tunnel_secret: string };
    }>(`/accounts/${this.config.cloudflare.accountId}/cfd_tunnel`, {
      method: 'POST',
      body: JSON.stringify({ name, tunnel_secret: tunnelSecret }),
    });

    return {
      id: result.id,
      token: tunnelSecret,
    };
  }

  async getCloudflareTunnels(): Promise<Array<{ id: string; name: string; status: string }>> {
    if (!this.config.cloudflare?.accountId) {
      throw new Error('Cloudflare account ID not configured');
    }

    return this.cloudflareRequest(`/accounts/${this.config.cloudflare.accountId}/cfd_tunnel`);
  }

  async deleteCloudflareTunnel(tunnelId: string): Promise<void> {
    if (!this.config.cloudflare?.accountId) {
      throw new Error('Cloudflare account ID not configured');
    }

    await this.cloudflareRequest(
      `/accounts/${this.config.cloudflare.accountId}/cfd_tunnel/${tunnelId}`,
      { method: 'DELETE' }
    );
  }

  // ngrok
  private async ngrokRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.config.ngrok?.authToken) {
      throw new Error('ngrok auth token not configured');
    }

    const response = await fetch(`${NGROK_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.ngrok.authToken}`,
        'Content-Type': 'application/json',
        'Ngrok-Version': '2',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ msg: response.statusText }));
      throw new Error(`ngrok API error: ${error.msg || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async getNgrokTunnels(): Promise<Array<{
    id: string;
    public_url: string;
    proto: string;
    forwards_to: string;
  }>> {
    const result = await this.ngrokRequest<{
      tunnels: Array<{
        id: string;
        public_url: string;
        proto: string;
        forwards_to: string;
      }>;
    }>('/tunnels');

    return result.tunnels;
  }

  async createNgrokTunnel(config: {
    addr: string;
    proto?: 'http' | 'tcp';
    domain?: string;
    metadata?: string;
  }): Promise<{
    id: string;
    public_url: string;
    forwards_to: string;
  }> {
    return this.ngrokRequest('/tunnels', {
      method: 'POST',
      body: JSON.stringify({
        addr: config.addr,
        proto: config.proto || 'http',
        domain: config.domain,
        metadata: config.metadata,
      }),
    });
  }

  async deleteNgrokTunnel(tunnelId: string): Promise<void> {
    await this.ngrokRequest(`/tunnels/${tunnelId}`, { method: 'DELETE' });
  }

  // Local tunnel management
  registerTunnel(tunnel: Tunnel): void {
    this.tunnels.set(tunnel.id, tunnel);
  }

  getTunnel(tunnelId: string): Tunnel | undefined {
    return this.tunnels.get(tunnelId);
  }

  getTunnels(filter?: {
    provider?: Tunnel['provider'];
    status?: Tunnel['status'];
    protocol?: Tunnel['protocol'];
  }): Tunnel[] {
    let tunnels = Array.from(this.tunnels.values());

    if (filter?.provider) {
      tunnels = tunnels.filter((t) => t.provider === filter.provider);
    }
    if (filter?.status) {
      tunnels = tunnels.filter((t) => t.status === filter.status);
    }
    if (filter?.protocol) {
      tunnels = tunnels.filter((t) => t.protocol === filter.protocol);
    }

    return tunnels;
  }

  updateTunnelStatus(tunnelId: string, status: Tunnel['status']): void {
    const tunnel = this.tunnels.get(tunnelId);
    if (tunnel) {
      tunnel.status = status;
      this.tunnels.set(tunnelId, tunnel);
    }
  }

  // Configuration generators
  generateCloudflaredConfig(tunnels?: Tunnel[]): string {
    const activeTunnels = tunnels || this.getTunnels({ provider: 'cloudflare' });

    const config = {
      tunnel: this.config.cloudflare?.tunnelId || 'blackroad-dev',
      credentials_file: '/etc/cloudflared/credentials.json',
      ingress: [
        ...activeTunnels.map((t) => ({
          hostname: new URL(t.publicUrl).hostname,
          service: `${t.protocol}://${t.localHost}:${t.localPort}`,
        })),
        { service: 'http_status:404' },
      ],
    };

    return `# Cloudflare Tunnel Configuration
# Generated by BlackRoad OS API Gateway
# Save to ~/.cloudflared/config.yml

tunnel: ${config.tunnel}
credentials-file: ${config.credentials_file}

ingress:
${config.ingress
  .map((i) => {
    if ('hostname' in i) {
      return `  - hostname: ${i.hostname}
    service: ${i.service}`;
    }
    return `  - service: ${i.service}`;
  })
  .join('\n')}
`;
  }

  generateNgrokConfig(): string {
    const tunnels = this.getTunnels({ provider: 'ngrok' });

    return `# ngrok Configuration
# Generated by BlackRoad OS API Gateway
# Save to ~/.ngrok2/ngrok.yml

version: "2"
authtoken: ${this.config.ngrok?.authToken || 'YOUR_AUTH_TOKEN'}
${this.config.ngrok?.region ? `region: ${this.config.ngrok.region}` : ''}

tunnels:
${tunnels
  .map(
    (t) => `  ${t.name.toLowerCase().replace(/\s+/g, '-')}:
    proto: ${t.protocol === 'ssh' ? 'tcp' : 'http'}
    addr: ${t.localPort}
    ${t.metadata?.domain ? `domain: ${t.metadata.domain}` : ''}`
  )
  .join('\n')}
`;
  }

  // BlackRoad OS specific helpers
  async exposeService(
    service: string,
    port: number,
    options?: {
      provider?: 'cloudflare' | 'ngrok';
      subdomain?: string;
      protocol?: 'http' | 'https' | 'tcp';
    }
  ): Promise<Tunnel> {
    const provider = options?.provider || this.config.defaultProvider || 'cloudflare';
    const protocol = options?.protocol || 'https';

    const tunnelId = `${service}-${Date.now()}`;
    const tunnel: Tunnel = {
      id: tunnelId,
      name: `${service} Service`,
      provider,
      status: 'pending',
      publicUrl: options?.subdomain
        ? `https://${options.subdomain}.blackroad.io`
        : `https://${service}.blackroad.io`,
      localPort: port,
      localHost: 'localhost',
      protocol,
      createdAt: new Date().toISOString(),
      metadata: { service, autoCreated: true },
    };

    this.registerTunnel(tunnel);
    return tunnel;
  }

  generateDockerComposeFragment(): string {
    return `# Cloudflare Tunnel Sidecar
# Add this to your docker-compose.yml
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes:
      - ./cloudflared:/etc/cloudflared
    depends_on:
      - api-gateway
      - beacon
    restart: unless-stopped
    networks:
      - blackroad
`;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if at least one provider is configured
      const hasCloudflare = !!this.config.cloudflare?.accountId || !!this.config.apiKey;
      const hasNgrok = !!this.config.ngrok?.authToken;

      return hasCloudflare || hasNgrok || this.tunnels.size > 0;
    } catch {
      return false;
    }
  }
}

export async function initTunnels(config: TunnelConfig): Promise<boolean> {
  const tunnels = new TunnelIntegration(config);
  return tunnels.healthCheck();
}

export function tunnelsHealthCheck(config: TunnelConfig): () => Promise<boolean> {
  const tunnels = new TunnelIntegration(config);
  return () => tunnels.healthCheck();
}
