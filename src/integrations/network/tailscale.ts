/**
 * Tailscale Network Integration
 * Mesh VPN networking and device management via Tailscale API
 * https://tailscale.com/api
 *
 * Routes BlackRoad OS traffic through the private Tailscale mesh rather than
 * through external AI vendors or untrusted infrastructure.
 */

import type { IntegrationConfig } from '../manager';

export interface TailscaleDevice {
  id: string;
  nodeId: string;
  user: string;
  name: string;
  hostname: string;
  clientVersion: string;
  updateAvailable: boolean;
  os: string;
  ipAddresses: string[];
  advertisedRoutes: string[];
  enabledRoutes: string[];
  lastSeen: string;
  keyExpiryDisabled: boolean;
  expired: boolean;
  isExternal: boolean;
  machineKey: string;
  blocksIncomingConnections: boolean;
  authorized: boolean;
  tags?: string[];
}

export interface TailscaleDNSConfig {
  domains: string[];
  nameservers: string[];
  overrideLocalDNS: boolean;
}

export interface TailscaleACL {
  acls: Array<{
    action: 'accept' | 'deny';
    src: string[];
    dst: string[];
  }>;
  tagOwners?: Record<string, string[]>;
  tests?: Array<{ src: string; accept: string[]; deny: string[] }>;
}

export interface TailscaleConfig extends IntegrationConfig {
  tailnet?: string;
  deviceTags?: string[];
}

const TAILSCALE_API_URL = 'https://api.tailscale.com/api/v2';

export class TailscaleIntegration {
  private apiKey: string;
  private tailnet: string;

  constructor(private config: TailscaleConfig) {
    this.apiKey = config.apiKey || process.env.TAILSCALE_API_KEY || '';
    this.tailnet = config.tailnet || process.env.TAILSCALE_TAILNET || '-';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Tailscale API key not configured');
    }

    const response = await fetch(`${TAILSCALE_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      throw new Error(`Tailscale API error ${response.status}: ${body}`);
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  // Devices
  async getDevices(): Promise<TailscaleDevice[]> {
    const result = await this.request<{ devices: TailscaleDevice[] }>(`/tailnet/${this.tailnet}/devices`);
    return result.devices || [];
  }

  async getDevice(deviceId: string): Promise<TailscaleDevice> {
    return this.request<TailscaleDevice>(`/device/${deviceId}`);
  }

  async authorizeDevice(deviceId: string): Promise<void> {
    await this.request(`/device/${deviceId}/authorized`, {
      method: 'POST',
      body: JSON.stringify({ authorized: true }),
    });
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await this.request(`/device/${deviceId}`, { method: 'DELETE' });
  }

  async setDeviceTags(deviceId: string, tags: string[]): Promise<void> {
    await this.request(`/device/${deviceId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags }),
    });
  }

  async setDeviceRoutes(deviceId: string, routes: string[]): Promise<void> {
    await this.request(`/device/${deviceId}/routes`, {
      method: 'POST',
      body: JSON.stringify({ routes }),
    });
  }

  // DNS
  async getDNSConfig(): Promise<TailscaleDNSConfig> {
    return this.request<TailscaleDNSConfig>(`/tailnet/${this.tailnet}/dns/nameservers`);
  }

  async setDNSConfig(config: Partial<TailscaleDNSConfig>): Promise<TailscaleDNSConfig> {
    return this.request<TailscaleDNSConfig>(`/tailnet/${this.tailnet}/dns/nameservers`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // ACL
  async getACL(): Promise<TailscaleACL> {
    return this.request<TailscaleACL>(`/tailnet/${this.tailnet}/acl`);
  }

  async setACL(acl: TailscaleACL): Promise<TailscaleACL> {
    return this.request<TailscaleACL>(`/tailnet/${this.tailnet}/acl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(acl),
    });
  }

  // BlackRoad OS helpers
  /**
   * Return all Pi devices (tagged with "tag:pi") in the tailnet.
   */
  async getPiDevices(): Promise<TailscaleDevice[]> {
    const devices = await this.getDevices();
    return devices.filter((d) => d.tags?.includes('tag:pi'));
  }

  /**
   * Return the IP addresses for a named Pi host (e.g. "lucidia", "blackroad").
   */
  async getPiAddress(hostname: string): Promise<string | undefined> {
    const devices = await this.getDevices();
    const device = devices.find((d) => d.hostname.toLowerCase().includes(hostname.toLowerCase()));
    return device?.ipAddresses?.[0];
  }

  /**
   * Check whether traffic to a destination will route through the Tailscale mesh
   * rather than through external/public internet paths.
   */
  isPrivateRoute(ipOrHostname: string): boolean {
    const privateRanges = [
      /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,  // 100.64.0.0/10 (Tailscale)
      /^10\./,                                         // RFC 1918
      /^172\.(1[6-9]|2\d|3[01])\./,                  // RFC 1918
      /^192\.168\./,                                   // RFC 1918
    ];
    return privateRanges.some((re) => re.test(ipOrHostname));
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.apiKey) return false;
      await this.getDevices();
      return true;
    } catch {
      return false;
    }
  }
}

export async function initTailscale(config: TailscaleConfig): Promise<boolean> {
  const tailscale = new TailscaleIntegration(config);
  return tailscale.healthCheck();
}

export function tailscaleHealthCheck(config: TailscaleConfig): () => Promise<boolean> {
  const tailscale = new TailscaleIntegration(config);
  return () => tailscale.healthCheck();
}
