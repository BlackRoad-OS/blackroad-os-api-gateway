# blackroad-os-beacon

Lightweight status-ping collector built with Go 1.22 and Fiber v3. Beacon captures health pings, stores them in BoltDB, and streams them to the Core UI via SSE.
# Blackroad OS · API Gateway

Gateway-Gen-0 scaffold for a single entry-point that fronts Blackroad OS services via REST and GraphQL.

## Quickstart

```bash
go run ./cmd/beacon      # :5000
curl -X POST :5000/ping -H "Content-Type: application/json" -d '{"env":"core","status":"ok"}'
curl :5000/stream        # see live SSE
```

### Docker

```bash
docker build -t blackroad/beacon:0.0.1 .
docker run -e PORT=5000 -p 5000:5000 blackroad/beacon:0.0.1
```

## Configuration

Environment variables:

- `PORT` — HTTP port (default `5000`).
- `BOLT_PATH` — path to BoltDB file (default `./data/beacon.db`).
- `HMAC_SECRET` — shared secret for HMAC auth on write endpoints.

## Scripts

- `make run` — start the server.
- `make test` — run tests.
- `make build` — compile the service.
- `make sig` — refresh `public/sig_beacon.json`.

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

Copy `.env.example` and fill in service URLs and JWT keys. No secrets are committed.

## Scripts

- `pnpm dev` – start the gateway with watch mode using tsx.
- `pnpm build` – lint, test, compile TypeScript, and emit beacon metadata.
- `pnpm start` – run the compiled server from `dist`.

## TODO(gateway-next)

- Wire real JWT validation rules and authorization.
- Compose remote schemas with Federation v2 and enable caching.
- Add persistent rate-limit and request tracing.
