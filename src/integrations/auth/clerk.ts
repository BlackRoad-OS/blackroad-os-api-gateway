/**
 * Clerk Authentication Integration
 * User authentication and management via Clerk
 * https://clerk.com/docs
 */

import type { IntegrationConfig } from '../manager';

export interface ClerkUser {
  id: string;
  external_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  email_addresses: ClerkEmailAddress[];
  phone_numbers: ClerkPhoneNumber[];
  primary_email_address_id?: string;
  primary_phone_number_id?: string;
  profile_image_url: string;
  public_metadata: Record<string, unknown>;
  private_metadata: Record<string, unknown>;
  unsafe_metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  last_sign_in_at?: number;
  banned: boolean;
}

export interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification: { status: string };
}

export interface ClerkPhoneNumber {
  id: string;
  phone_number: string;
  verification: { status: string };
}

export interface ClerkSession {
  id: string;
  user_id: string;
  client_id: string;
  status: 'active' | 'ended' | 'removed' | 'replaced' | 'abandoned';
  last_active_at: number;
  expire_at: number;
  created_at: number;
  updated_at: number;
}

export interface ClerkOrganization {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  members_count: number;
  max_allowed_memberships: number;
  public_metadata: Record<string, unknown>;
  private_metadata: Record<string, unknown>;
  created_at: number;
  updated_at: number;
}

export interface ClerkConfig extends IntegrationConfig {
  secretKey?: string;
  publishableKey?: string;
  jwtKey?: string;
  allowedOrigins?: string[];
}

const CLERK_API_URL = 'https://api.clerk.com/v1';

export class ClerkIntegration {
  private secretKey: string;
  private config: ClerkConfig;

  constructor(config: ClerkConfig) {
    this.config = config;
    this.secretKey = config.secretKey || config.apiSecret || process.env.CLERK_SECRET_KEY || '';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${CLERK_API_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ errors: [{ message: response.statusText }] }));
      throw new Error(`Clerk API error: ${error.errors?.[0]?.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Users
  async getUsers(params?: {
    limit?: number;
    offset?: number;
    email_address?: string[];
    phone_number?: string[];
    username?: string[];
    user_id?: string[];
  }): Promise<ClerkUser[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.email_address) params.email_address.forEach((e) => searchParams.append('email_address', e));
    if (params?.phone_number) params.phone_number.forEach((p) => searchParams.append('phone_number', p));
    if (params?.username) params.username.forEach((u) => searchParams.append('username', u));
    if (params?.user_id) params.user_id.forEach((id) => searchParams.append('user_id', id));

    const query = searchParams.toString();
    return this.request<ClerkUser[]>(`/users${query ? `?${query}` : ''}`);
  }

  async getUser(userId: string): Promise<ClerkUser> {
    return this.request<ClerkUser>(`/users/${userId}`);
  }

  async createUser(data: {
    email_address?: string[];
    phone_number?: string[];
    username?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    public_metadata?: Record<string, unknown>;
    private_metadata?: Record<string, unknown>;
    skip_password_checks?: boolean;
    skip_password_requirement?: boolean;
  }): Promise<ClerkUser> {
    return this.request<ClerkUser>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(
    userId: string,
    data: Partial<{
      first_name: string;
      last_name: string;
      username: string;
      public_metadata: Record<string, unknown>;
      private_metadata: Record<string, unknown>;
    }>
  ): Promise<ClerkUser> {
    return this.request<ClerkUser>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string): Promise<{ id: string; deleted: boolean }> {
    return this.request(`/users/${userId}`, { method: 'DELETE' });
  }

  async banUser(userId: string): Promise<ClerkUser> {
    return this.request<ClerkUser>(`/users/${userId}/ban`, { method: 'POST' });
  }

  async unbanUser(userId: string): Promise<ClerkUser> {
    return this.request<ClerkUser>(`/users/${userId}/unban`, { method: 'POST' });
  }

  // Sessions
  async getSessions(params?: {
    client_id?: string;
    user_id?: string;
    status?: 'active' | 'ended' | 'removed' | 'replaced' | 'abandoned';
  }): Promise<ClerkSession[]> {
    const searchParams = new URLSearchParams();
    if (params?.client_id) searchParams.set('client_id', params.client_id);
    if (params?.user_id) searchParams.set('user_id', params.user_id);
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    return this.request<ClerkSession[]>(`/sessions${query ? `?${query}` : ''}`);
  }

  async getSession(sessionId: string): Promise<ClerkSession> {
    return this.request<ClerkSession>(`/sessions/${sessionId}`);
  }

  async revokeSession(sessionId: string): Promise<ClerkSession> {
    return this.request<ClerkSession>(`/sessions/${sessionId}/revoke`, { method: 'POST' });
  }

  // Organizations
  async getOrganizations(params?: { limit?: number; offset?: number }): Promise<ClerkOrganization[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const query = searchParams.toString();
    const result = await this.request<{ data: ClerkOrganization[] }>(`/organizations${query ? `?${query}` : ''}`);
    return result.data;
  }

  async getOrganization(organizationId: string): Promise<ClerkOrganization> {
    return this.request<ClerkOrganization>(`/organizations/${organizationId}`);
  }

  async createOrganization(data: {
    name: string;
    slug?: string;
    public_metadata?: Record<string, unknown>;
    private_metadata?: Record<string, unknown>;
    created_by?: string;
  }): Promise<ClerkOrganization> {
    return this.request<ClerkOrganization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // JWT Verification
  async verifyToken(token: string): Promise<{
    sub: string;
    sid: string;
    iss: string;
    iat: number;
    exp: number;
    azp: string;
  }> {
    // For JWT verification, we typically use the JWKS endpoint
    // This is a simplified version - in production, use proper JWT verification
    const response = await fetch(`${CLERK_API_URL}/verify_token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Token verification failed');
    }

    return response.json();
  }

  // BlackRoad OS specific helpers
  async getUserByEmail(email: string): Promise<ClerkUser | null> {
    const users = await this.getUsers({ email_address: [email] });
    return users.length > 0 ? users[0] : null;
  }

  async setUserRole(userId: string, role: 'admin' | 'developer' | 'viewer'): Promise<ClerkUser> {
    return this.updateUser(userId, {
      public_metadata: { role },
    });
  }

  async getUserRole(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    return (user.public_metadata.role as string) || 'viewer';
  }

  async createServiceAccount(name: string, permissions: string[]): Promise<ClerkUser> {
    return this.createUser({
      username: `service_${name}`,
      skip_password_requirement: true,
      public_metadata: {
        type: 'service_account',
        permissions,
      },
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const users = await this.getUsers({ limit: 1 });
      return users.length >= 0;
    } catch {
      return false;
    }
  }
}

export async function initClerk(config: ClerkConfig): Promise<boolean> {
  const clerk = new ClerkIntegration(config);
  return clerk.healthCheck();
}

export function clerkHealthCheck(config: ClerkConfig): () => Promise<boolean> {
  const clerk = new ClerkIntegration(config);
  return () => clerk.healthCheck();
}
