# Blackroad OS · API Gateway

Gateway-Gen-0 scaffold for a single entry-point that fronts Blackroad OS services via REST and GraphQL.

## Quickstart

```bash
pnpm install
pnpm dev
```

Visit `http://localhost:4000/health` to verify the gateway is running.

### Docker

```bash
docker build -t blackroad/gateway:0.0.1 .
docker run -e PORT=4000 -p 4000:4000 blackroad/gateway:0.0.1
```

## Environment

Copy `gateway.env.example` and fill in service URLs and JWT keys. No secrets are committed.

## Scripts

- `pnpm dev` – start the gateway with watch mode using tsx.
- `pnpm build` – lint, test, compile TypeScript, and emit beacon metadata.
- `pnpm start` – run the compiled server from `dist`.

## TODO(gateway-next)

- Wire real JWT validation rules and authorization.
- Compose remote schemas with Federation v2 and enable caching.
- Add persistent rate-limit and request tracing.
