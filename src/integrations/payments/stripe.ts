/**
 * Stripe Payment Integration
 * Payment processing and subscription management via Stripe
 * https://stripe.com/docs/api
 */

import type { IntegrationConfig } from '../manager';

export interface StripeCustomer {
  id: string;
  object: 'customer';
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata: Record<string, string>;
  created: number;
  currency?: string;
  default_source?: string;
  invoice_settings: {
    default_payment_method?: string;
  };
}

export interface StripeSubscription {
  id: string;
  object: 'subscription';
  customer: string;
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'paused';
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at?: number;
  items: {
    data: Array<{
      id: string;
      price: { id: string; product: string; unit_amount: number; currency: string };
      quantity: number;
    }>;
  };
  metadata: Record<string, string>;
  created: number;
}

export interface StripePaymentIntent {
  id: string;
  object: 'payment_intent';
  amount: number;
  currency: string;
  customer?: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  client_secret: string;
  metadata: Record<string, string>;
  created: number;
}

export interface StripeProduct {
  id: string;
  object: 'product';
  name: string;
  description?: string;
  active: boolean;
  metadata: Record<string, string>;
  created: number;
  default_price?: string;
}

export interface StripePrice {
  id: string;
  object: 'price';
  product: string;
  active: boolean;
  currency: string;
  unit_amount: number;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
  };
  type: 'one_time' | 'recurring';
  metadata: Record<string, string>;
  created: number;
}

export interface StripeConfig extends IntegrationConfig {
  publishableKey?: string;
  webhookSecret?: string;
}

const STRIPE_API_URL = 'https://api.stripe.com/v1';

export class StripeIntegration {
  private secretKey: string;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.secretKey = config.apiKey || config.apiSecret || process.env.STRIPE_SECRET_KEY || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    body?: Record<string, unknown>
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    let formBody: string | undefined;
    if (body) {
      formBody = this.encodeFormData(body);
    }

    const response = await fetch(`${STRIPE_API_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
      body: formBody,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Stripe API error: ${error.error?.message || response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  private encodeFormData(data: Record<string, unknown>, prefix = ''): string {
    const params: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      const paramKey = prefix ? `${prefix}[${key}]` : key;

      if (value === null || value === undefined) continue;

      if (typeof value === 'object' && !Array.isArray(value)) {
        params.push(this.encodeFormData(value as Record<string, unknown>, paramKey));
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            params.push(this.encodeFormData(item as Record<string, unknown>, `${paramKey}[${index}]`));
          } else {
            params.push(`${encodeURIComponent(`${paramKey}[${index}]`)}=${encodeURIComponent(String(item))}`);
          }
        });
      } else {
        params.push(`${encodeURIComponent(paramKey)}=${encodeURIComponent(String(value))}`);
      }
    }

    return params.filter(Boolean).join('&');
  }

  // Customers
  async getCustomers(params?: { limit?: number; email?: string }): Promise<{ data: StripeCustomer[] }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.email) searchParams.set('email', params.email);

    const query = searchParams.toString();
    return this.request(`/customers${query ? `?${query}` : ''}`);
  }

  async getCustomer(customerId: string): Promise<StripeCustomer> {
    return this.request<StripeCustomer>(`/customers/${customerId}`);
  }

  async createCustomer(data: {
    email?: string;
    name?: string;
    phone?: string;
    description?: string;
    metadata?: Record<string, string>;
    payment_method?: string;
  }): Promise<StripeCustomer> {
    return this.request<StripeCustomer>('/customers', { method: 'POST' }, data);
  }

  async updateCustomer(
    customerId: string,
    data: Partial<{
      email: string;
      name: string;
      phone: string;
      description: string;
      metadata: Record<string, string>;
    }>
  ): Promise<StripeCustomer> {
    return this.request<StripeCustomer>(`/customers/${customerId}`, { method: 'POST' }, data);
  }

  async deleteCustomer(customerId: string): Promise<{ id: string; deleted: boolean }> {
    return this.request(`/customers/${customerId}`, { method: 'DELETE' });
  }

  // Subscriptions
  async getSubscriptions(params?: {
    customer?: string;
    status?: string;
    limit?: number;
  }): Promise<{ data: StripeSubscription[] }> {
    const searchParams = new URLSearchParams();
    if (params?.customer) searchParams.set('customer', params.customer);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return this.request(`/subscriptions${query ? `?${query}` : ''}`);
  }

  async getSubscription(subscriptionId: string): Promise<StripeSubscription> {
    return this.request<StripeSubscription>(`/subscriptions/${subscriptionId}`);
  }

  async createSubscription(data: {
    customer: string;
    items: Array<{ price: string; quantity?: number }>;
    trial_period_days?: number;
    metadata?: Record<string, string>;
    default_payment_method?: string;
  }): Promise<StripeSubscription> {
    return this.request<StripeSubscription>('/subscriptions', { method: 'POST' }, data);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd = true
  ): Promise<StripeSubscription> {
    if (cancelAtPeriodEnd) {
      return this.request<StripeSubscription>(
        `/subscriptions/${subscriptionId}`,
        { method: 'POST' },
        { cancel_at_period_end: true }
      );
    }
    return this.request<StripeSubscription>(`/subscriptions/${subscriptionId}`, { method: 'DELETE' });
  }

  // Payment Intents
  async createPaymentIntent(data: {
    amount: number;
    currency: string;
    customer?: string;
    payment_method_types?: string[];
    metadata?: Record<string, string>;
    automatic_payment_methods?: { enabled: boolean };
  }): Promise<StripePaymentIntent> {
    return this.request<StripePaymentIntent>('/payment_intents', { method: 'POST' }, data);
  }

  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethod?: string
  ): Promise<StripePaymentIntent> {
    const data = paymentMethod ? { payment_method: paymentMethod } : {};
    return this.request<StripePaymentIntent>(
      `/payment_intents/${paymentIntentId}/confirm`,
      { method: 'POST' },
      data
    );
  }

  // Products
  async getProducts(params?: { active?: boolean; limit?: number }): Promise<{ data: StripeProduct[] }> {
    const searchParams = new URLSearchParams();
    if (params?.active !== undefined) searchParams.set('active', String(params.active));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    return this.request(`/products${query ? `?${query}` : ''}`);
  }

  async createProduct(data: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
    default_price_data?: {
      currency: string;
      unit_amount: number;
      recurring?: { interval: 'day' | 'week' | 'month' | 'year' };
    };
  }): Promise<StripeProduct> {
    return this.request<StripeProduct>('/products', { method: 'POST' }, data);
  }

  // Prices
  async getPrices(params?: { product?: string; active?: boolean }): Promise<{ data: StripePrice[] }> {
    const searchParams = new URLSearchParams();
    if (params?.product) searchParams.set('product', params.product);
    if (params?.active !== undefined) searchParams.set('active', String(params.active));

    const query = searchParams.toString();
    return this.request(`/prices${query ? `?${query}` : ''}`);
  }

  async createPrice(data: {
    product: string;
    currency: string;
    unit_amount: number;
    recurring?: { interval: 'day' | 'week' | 'month' | 'year'; interval_count?: number };
    metadata?: Record<string, string>;
  }): Promise<StripePrice> {
    return this.request<StripePrice>('/prices', { method: 'POST' }, data);
  }

  // Webhook verification
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    // Simplified signature verification
    // In production, use Stripe's official SDK for proper verification
    const elements = signature.split(',');
    const timestampElement = elements.find((e) => e.startsWith('t='));
    const sigElement = elements.find((e) => e.startsWith('v1='));

    if (!timestampElement || !sigElement) {
      return false;
    }

    const timestamp = timestampElement.split('=')[1];
    const expectedSig = sigElement.split('=')[1];

    // Verify timestamp is within tolerance (5 minutes)
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
      return false;
    }

    // In production, compute HMAC and compare
    // This is a placeholder - use proper crypto verification
    return expectedSig.length > 0;
  }

  // BlackRoad OS specific helpers
  async createBlackRoadCustomer(
    email: string,
    name: string,
    plan: 'free' | 'pro' | 'enterprise'
  ): Promise<StripeCustomer> {
    return this.createCustomer({
      email,
      name,
      metadata: {
        platform: 'blackroad-os',
        plan,
        created_at: new Date().toISOString(),
      },
    });
  }

  async subscribeToBlackRoadPlan(
    customerId: string,
    priceId: string
  ): Promise<StripeSubscription> {
    return this.createSubscription({
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        platform: 'blackroad-os',
      },
    });
  }

  async getCustomerSubscriptionStatus(customerId: string): Promise<{
    hasActiveSubscription: boolean;
    subscription?: StripeSubscription;
  }> {
    const { data: subscriptions } = await this.getSubscriptions({
      customer: customerId,
      status: 'active',
    });

    return {
      hasActiveSubscription: subscriptions.length > 0,
      subscription: subscriptions[0],
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { data: customers } = await this.getCustomers({ limit: 1 });
      return customers.length >= 0;
    } catch {
      return false;
    }
  }
}

export async function initStripe(config: StripeConfig): Promise<boolean> {
  const stripe = new StripeIntegration(config);
  return stripe.healthCheck();
}

export function stripeHealthCheck(config: StripeConfig): () => Promise<boolean> {
  const stripe = new StripeIntegration(config);
  return () => stripe.healthCheck();
}
