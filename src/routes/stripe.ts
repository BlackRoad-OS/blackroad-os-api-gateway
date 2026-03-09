/**
 * Stripe Payment Routes
 * Exposes Stripe integration through the BlackRoad OS API Gateway.
 *
 * All routes require JWT authentication except the webhook endpoint,
 * which uses Stripe's own signature verification.
 *
 * COMPLIANCE-SENSITIVE GATEWAY PATH
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import { StripeIntegration } from '../integrations/payments/stripe';

const stripeRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register a raw body content type parser for the webhook route
  // The raw payload is required for Stripe signature verification
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body: Buffer, done) => {
      // Store raw buffer for webhook verification before JSON parsing
      (req as unknown as { rawBody: Buffer }).rawBody = body;
      try {
        done(null, JSON.parse(body.toString('utf8')));
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );
  function getStripe(): StripeIntegration {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    return new StripeIntegration({
      enabled: true,
      apiKey: secretKey,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    });
  }

  /** GET /stripe/products — list active BlackRoad OS products */
  fastify.get('/stripe/products', {
    schema: {
      description: 'List active BlackRoad OS products',
      tags: ['stripe', 'payments'],
    },
    preHandler: fastify.verifyJWT,
    handler: async (_request, reply) => {
      try {
        const stripe = getStripe();
        const { data: products } = await stripe.getProducts({ active: true });
        return { products };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.code(500).send({ error: message });
      }
    },
  });

  /** GET /stripe/prices — list active prices */
  fastify.get('/stripe/prices', {
    schema: {
      description: 'List active prices',
      tags: ['stripe', 'payments'],
      querystring: {
        type: 'object',
        properties: {
          product: { type: 'string' },
        },
      },
    },
    preHandler: fastify.verifyJWT,
    handler: async (request, reply) => {
      try {
        const { product } = request.query as { product?: string };
        const stripe = getStripe();
        const { data: prices } = await stripe.getPrices({ product, active: true });
        return { prices };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.code(500).send({ error: message });
      }
    },
  });

  /** POST /stripe/checkout — create a payment intent */
  fastify.post<{
    Body: {
      amount: number;
      currency: string;
      customer?: string;
      metadata?: Record<string, string>;
    };
  }>('/stripe/checkout', {
    schema: {
      description: 'Create a Stripe payment intent',
      tags: ['stripe', 'payments'],
      body: {
        type: 'object',
        required: ['amount', 'currency'],
        properties: {
          amount: { type: 'number', description: 'Amount in smallest currency unit (e.g. cents)' },
          currency: { type: 'string', description: 'ISO 4217 currency code (e.g. usd)' },
          customer: { type: 'string', description: 'Stripe customer ID' },
          metadata: { type: 'object' },
        },
      },
    },
    preHandler: fastify.verifyJWT,
    handler: async (request, reply) => {
      try {
        const { amount, currency, customer, metadata } = request.body;
        const stripe = getStripe();
        const intent = await stripe.createPaymentIntent({
          amount,
          currency,
          customer,
          automatic_payment_methods: { enabled: true },
          metadata: { platform: 'blackroad-os', ...metadata },
        });
        return {
          paymentIntentId: intent.id,
          clientSecret: intent.client_secret,
          status: intent.status,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.code(500).send({ error: message });
      }
    },
  });

  /** GET /stripe/customers/:customerId/subscription — subscription status */
  fastify.get<{ Params: { customerId: string } }>('/stripe/customers/:customerId/subscription', {
    schema: {
      description: 'Get subscription status for a Stripe customer',
      tags: ['stripe', 'payments'],
      params: {
        type: 'object',
        required: ['customerId'],
        properties: {
          customerId: { type: 'string' },
        },
      },
    },
    preHandler: fastify.verifyJWT,
    handler: async (request, reply) => {
      try {
        const { customerId } = request.params;
        const stripe = getStripe();
        const status = await stripe.getCustomerSubscriptionStatus(customerId);
        return status;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.code(500).send({ error: message });
      }
    },
  });

  /** POST /stripe/webhooks — Stripe webhook endpoint */
  fastify.post('/stripe/webhooks', {
    schema: {
      description: 'Stripe webhook receiver',
      tags: ['stripe', 'payments'],
    },
    handler: async (request, reply) => {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        request.log.warn('Stripe webhook secret not configured');
        return reply.code(400).send({ error: 'Webhook not configured' });
      }

      const signature = request.headers['stripe-signature'];
      if (!signature || typeof signature !== 'string') {
        return reply.code(400).send({ error: 'Missing stripe-signature header' });
      }

      // Use the raw body captured by the content type parser for signature verification
      const rawBody = (request as unknown as { rawBody?: Buffer }).rawBody;
      const payload = rawBody ? rawBody.toString('utf8') : JSON.stringify(request.body);

      const stripe = getStripe();
      if (!stripe.verifyWebhookSignature(payload, signature)) {
        request.log.warn('Stripe webhook signature verification failed');
        return reply.code(400).send({ error: 'Invalid webhook signature' });
      }

      const event = request.body as { type: string; data: { object: Record<string, unknown> } };
      request.log.info({ eventType: event.type }, 'Stripe webhook received');

      // Handle key subscription lifecycle events
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          request.log.info({ eventType: event.type, customerId: event.data.object['customer'] }, 'Subscription event');
          break;
        case 'payment_intent.succeeded':
          request.log.info({ eventType: event.type, intentId: event.data.object['id'] }, 'Payment succeeded');
          break;
        default:
          request.log.debug({ eventType: event.type }, 'Unhandled Stripe event type');
      }

      return { received: true };
    },
  });
};

export default fp(stripeRoute, {
  name: 'stripe-route',
  fastify: '4.x',
  dependencies: ['auth-plugin'],
});
