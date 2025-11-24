# blackroad-os-beacon

Lightweight status-ping collector built with Go 1.22 and Fiber v3. Beacon captures health pings, stores them in BoltDB, and streams them to the Core UI via SSE.

## Quickstart

```bash
go run ./cmd/beacon      # :5000
curl -X POST :5000/ping -d '{"env":"core","status":"ok"}'
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

