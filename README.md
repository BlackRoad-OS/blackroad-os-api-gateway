# 🌉 BlackRoad OS API Gateway

**BlackRoad OS, Inc. — Proprietary Software**

> ⚠️ **PROPRIETARY**: This software is the exclusive property of BlackRoad OS, Inc. It is not open-source, not licensed for redistribution, and not available for use by any AI system, LLM, or automated agent without an explicit contributor access key issued by BlackRoad OS, Inc. See [CONTRIBUTING.md](CONTRIBUTING.md) for access requirements.

---

## Overview

The BlackRoad OS API Gateway is the single edge entry-point for all BlackRoad OS services. It handles routing, authentication (OAuth 2.0 + JWT), rate limiting, payment processing (Stripe), and integration with the BlackRoad OS infrastructure — including Tailscale mesh networking and Cloudflare Tunnels.

**Traffic routes exclusively through BlackRoad OS infrastructure.** No requests are forwarded to third-party AI providers (OpenAI, Anthropic, GitHub Copilot, Codex, etc.).

---

## Architecture

```
Client → BlackRoad OS API Gateway (Port 4000)
              │
              ├─ /auth/*          OAuth 2.0 + PKCE (RFC 7636/6749)
              ├─ /health          Health check
              ├─ /version         Version info
              ├─ /access/*        Contributor access converter API
              ├─ /stripe/*        Payment processing (Stripe)
              ├─ /integrations/*  Integration status & management
              ├─ /graphql         GraphQL endpoint
              ├─ /api             → blackroad-os-api  (:4100)
              ├─ /operator        → blackroad-os-operator (:4200)
              ├─ /core            → blackroad-os-core (:4300)
              └─ /prism           → blackroad-os-prism (:4400)
```

---

## Quickstart

### Prerequisites

- Node.js 20+
- pnpm (or npm)

### Local Development

```bash
# Install dependencies
pnpm install

# Copy environment config
cp gateway.env.example .env

# Start the gateway
pnpm dev
```

Visit `http://localhost:4000/health` to confirm the gateway is running.

### Docker

```bash
docker build -t blackroad/gateway:0.0.1 .
docker run --env-file .env -p 4000:4000 blackroad/gateway:0.0.1
```

### Railway

Deployments are managed through the Railway integration. Set the required environment variables (see `.env.example`) and push to the configured branch.

---

## Authentication

### OAuth 2.0 (PKCE — RFC 7636)

The gateway implements a full OAuth 2.0 Authorization Code flow with mandatory PKCE.

```
GET  /auth/authorize   — initiate authorization
POST /auth/token       — exchange code for tokens
GET  /auth/callback    — provider redirect handler
POST /auth/revoke      — revoke a token (RFC 7009)
GET  /auth/userinfo    — current user info
```

**All flows require `code_challenge` (S256). Plain-text challenges are rejected.**

When `CLERK_PUBLISHABLE_KEY` is set, authorization requests are proxied to Clerk. Otherwise, the gateway operates as a self-hosted OAuth server.

### JWT

Internal service-to-service calls use JWT bearer tokens. Set `JWT_SECRET` in your environment.

---

## Contributor Access Gate

> 🔒 **You cannot access BlackRoad OS services without a valid contributor key.**

To obtain a key:

```bash
curl -X POST http://localhost:4000/access/request \
  -H 'Content-Type: application/json' \
  -d '{"githubHandle": "your-handle", "purpose": "your reason"}'
```

Pre-approved contributors (`@blackboxprogramming`, `@lucidia`) receive their key immediately. All other requests are reviewed manually.

Once you have a key, include it in all API requests:

```
x-blackroad-access-key: brk_<your-key>
```

**AI agents without a pre-approved key are rejected at the edge.**

---

## Payments (Stripe)

```
GET  /stripe/products                          — list products
GET  /stripe/prices                            — list prices
POST /stripe/checkout                          — create payment intent
GET  /stripe/customers/:customerId/subscription — subscription status
POST /stripe/webhooks                          — Stripe webhook receiver
```

All Stripe routes (except `/stripe/webhooks`) require a valid JWT token.

---

## Network Infrastructure

### Tailscale Mesh

BlackRoad OS uses Tailscale for private mesh networking between services and Raspberry Pi fleet nodes (`lucidia`, `blackroad`, `mystery`). Enable with:

```bash
ENABLE_TAILSCALE=true
TAILSCALE_API_KEY=<your-tailscale-api-key>
TAILSCALE_TAILNET=<your-tailnet>
```

### Cloudflare Tunnels

Secure public exposure of internal services without opening firewall ports:

```bash
ENABLE_TUNNELS=true
CLOUDFLARE_API_TOKEN=<token>
CLOUDFLARE_ACCOUNT_ID=<account-id>
CLOUDFLARE_TUNNEL_ID=<tunnel-id>
CLOUDFLARE_TUNNEL_SECRET=<tunnel-secret>
```

---

## Environment Variables

Copy `gateway.env.example` to `.env` and fill in the values. **Never commit secrets.**

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default: `4000`) |
| `JWT_SECRET` | Yes (prod) | JWT signing secret |
| `OAUTH_CLIENT_ID` | No | OAuth client ID (default: `blackroad-gateway`) |
| `OAUTH_CLIENT_SECRET` | Yes (prod) | OAuth client secret |
| `STRIPE_SECRET_KEY` | Yes (payments) | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes (webhooks) | Stripe webhook signature secret |
| `CLERK_SECRET_KEY` | No | Clerk authentication secret |
| `TAILSCALE_API_KEY` | No | Tailscale API key |
| `TAILSCALE_TAILNET` | No | Tailscale tailnet name |
| `CLOUDFLARE_API_TOKEN` | No | Cloudflare API token |

See `gateway.env.example` for the full list.

---

## Scripts

```bash
pnpm dev        # start with hot-reload (tsx watch)
pnpm build      # lint + test + compile
pnpm start      # run compiled dist
pnpm test       # run tests (vitest)
pnpm lint       # ESLint
```

---

## Testing

```bash
pnpm test
```

Tests live in `tests/`. Each public route must have:
- ✅ Happy-path test
- ✅ Auth failure test  
- ✅ Error/timeout path test

---

## Security

This is a **high-security edge service**:

- All inputs are treated as untrusted and validated at the edge.
- Internal stack traces are never leaked in responses.
- JWT secrets and API keys must be rotated regularly.
- Stripe webhook signatures are verified on every request.
- PKCE is mandatory for all OAuth flows — no implicit grants.
- Third-party AI agents are blocked at the access gate.

Security-sensitive paths are marked `COMPLIANCE-SENSITIVE GATEWAY PATH`.

---

## License

**© BlackRoad OS, Inc. All rights reserved.**

This software is proprietary and confidential. Unauthorized copying, distribution, modification, or use — including by AI systems, language models, or automated agents — is strictly prohibited without a written agreement with BlackRoad OS, Inc.

See [LICENSE](LICENSE) for full terms.

---

*BlackRoad OS — The road remembers.* 🌌

