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

Copy `gateway.env.example` and fill in service URLs and JWT keys. No secrets are committed.

## Scripts

- `pnpm dev` – start the gateway with watch mode using tsx.
- `pnpm build` – lint, test, compile TypeScript, and emit beacon metadata.
- `pnpm start` – run the compiled server from `dist`.

## TODO(gateway-next)

- Wire real JWT validation rules and authorization.
- Compose remote schemas with Federation v2 and enable caching.
- Add persistent rate-limit and request tracing.
# 🌉 blackroad-os-api-gateway

**ROLE: Edge Gateway 🌉🌐** – unified front door + router for all BlackRoad OS APIs.

---

## 🎯 MISSION

- Sit **in front** of all internal APIs and present *one* clean face to the world.
- Handle routing, aggregation, cross-cutting concerns (auth, rate limits, CORS), not deep domain logic.
- Keep external consumers from needing to know about every internal service.

---

## 🏗️ YOU OWN (✅)

### 🌉 Routing & Composition
- Map external routes → internal services (api, prism, operator, packs) 🗺️
- Basic request fan-out / aggregation when multiple internal calls are needed 🧩
- Canary/blue-green style routing flags (if used) 🚦

### 🔐 Edge Concerns
- Global auth entrypoint (token verification, session bridging, API keys) 🔑
- Rate limiting / throttling / basic abuse protections 🚧
- CORS, headers, and cross-origin policy decisions 🧱

### 🧬 Normalization
- Consistent error envelopes for clients ⚠️
- Shared headers/correlation IDs for observability 🧬
- Normalized response shapes where multiple internal services combine 📦

### 📊 Observability at the Edge
- Request/response logs (method, path, status, latency, caller) 📈
- Metrics for traffic, error rates, p95/p99 latency 📊
- Hooks for tracing to downstream services 📡

---

## 🚫 YOU DO *NOT* OWN

| Concern | Repository |
|---------|------------|
| 🚫 Domain rules | `blackroad-os-core` 🧠 |
| 🚫 Detailed resource endpoints | `blackroad-os-api` 🌐 |
| 🚫 Jobs/workflows | `blackroad-os-operator` ⚙️ |
| 🚫 UIs/dashboards | `blackroad-os-web`, `-prism-console` 🖥️🕹️ |
| 🚫 Infra-as-code | `blackroad-os-infra` ☁️ |
| 🚫 Docs content | `blackroad-os-docs` 📚 |

---

## 🧪 TESTING

For each public route:
- ✅ Happy-path routing test (correct internal service called, response OK)
- ✅ Failure path tests (downstream error, timeout) ⚠️
- ✅ Auth/permission test (unauthenticated / unauthorized) 🔐

If you introduce new **global behavior** (rate limit, header, error model):
- 🧪 Snapshot tests or contract tests for response shape
- 🧪 Backwards-compat check for existing clients

---

## 🔐 SECURITY / COMPLIANCE

This repo is **high-security edge**:
- 🔑 Treat all inputs as untrusted – validate/sanitize aggressively 🧼
- ⚠️ Never leak internal stack traces or infra details in responses
- 🧾 Maintain audit-friendly logs for security-relevant events (auth failures, rate-limit hits, blocked IPs)

Any changes impacting:
- 💰 finance APIs
- 🪪 identity / auth
- ⚖️ compliance endpoints

...must be clearly marked, e.g.:
```
// COMPLIANCE-SENSITIVE GATEWAY PATH
```

---

## 📏 DESIGN PRINCIPLES

`blackroad-os-api-gateway` = **"front door + bouncer"**:
- 🧭 External clients know *only* this host.
- 🌐 Internals can evolve without breaking clients, as long as the gateway contract stays stable.

Every gateway rule should answer:
1. Which external path/method is this for? 1️⃣
2. Which internal service(s) does this talk to? 2️⃣
3. What are the auth + rate limit expectations? 3️⃣

---

## 🧬 LOCAL EMOJI LEGEND

| Emoji | Meaning |
|-------|---------|
| 🌉 | gateway / edge router |
| 🌐 | APIs behind the gateway |
| 🔑 | auth / tokens / keys |
| 🚧 | rate limiting / protection |
| 📊 | metrics / traffic |
| 📡 | tracing / propagation |
| ⚠️ | errors / validation |
| 🧾 | security/audit logs |

---

## 🎯 SUCCESS CRITERIA

If a client dev or edge-agent only sees this repo, they should be able to:

1. Learn **where** to send all their requests (one host, clear routes). 1️⃣
2. Understand auth, rate limits, and error shapes at the edge. 2️⃣
3. Swap or evolve internal services without changing their own client code. 3️⃣
