/**
 * BlackRoad OS Platform Integrations
 * Unified integration module for all external services and platforms
 */

// Platform Integrations
export * from './platforms/railway';
export * from './platforms/cloudflare';
export * from './platforms/vercel';
export * from './platforms/digitalocean';
export * from './platforms/docker';

// Mobile & Desktop Tools
export * from './tools/warp';
export * from './tools/shellfish';
export * from './tools/working-copy';
export * from './tools/pyto';

// Productivity Services
export * from './services/asana';
export * from './services/notion';

// Authentication & Payments
export * from './auth/clerk';
export * from './payments/stripe';

// AI & ML
export * from './ai/huggingface';
export * from './ai/oss-models';

// Networking
export * from './network/tunnels';

// Integration Manager
export { IntegrationManager, type IntegrationConfig } from './manager';
