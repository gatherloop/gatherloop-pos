# Deploying `apps/api` with Docker (alternative path)

> **This is not the automated deployment path.** The primary, automated path is a statically
> compiled Go binary built in CI and run under systemd — see
> [`DEPLOY_NATIVE.md`](./DEPLOY_NATIVE.md). This document exists so the existing
> [`apps/api/Dockerfile`](../Dockerfile) — which backs the current Render deployment — stays
> documented as a supported alternative, and so the reverse-proxy configuration (needed by both
> paths) has a single home instead of being duplicated.

## Building and running the image

`apps/api/Dockerfile` builds the whole monorepo inside the image (Node, a JRE and Go, `npm
install`, the OpenAPI generator, then the Go build) and produces a container that runs the `api`
binary directly:

```bash
docker build -t gatherloop-pos-api -f apps/api/Dockerfile .
docker run -d \
  --name gatherloop-pos-api \
  --restart unless-stopped \
  -p 127.0.0.1:<PORT>:<PORT> \
  --env-file apps/api/.env \
  gatherloop-pos-api
```

Configuration is env-var-only (`DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT`,
`PORT`, `JWT_SECRET`, plus optional `APP_ENV`, `LOG_LEVEL`, `SERVICE_NAME`) — the same variables
`DEPLOY_NATIVE.md`'s secrets table lists, written to `apps/api/.env` on whatever host runs the
container. Bind the published port to `127.0.0.1` only: like the native deploy, the container is
never exposed directly, and the reverse proxy below is what the public hostname actually reaches.

## Reverse proxy and TLS

Neither deployment path exposes the app's port directly. A reverse proxy terminates TLS and
forwards to the local port the API is listening on. Pick one:

### Caddy

Caddy is the shorter option and provisions and renews certificates automatically via ACME:

```caddy
api.example.com {
    reverse_proxy 127.0.0.1:<PORT>
}
```

Reload with `sudo systemctl reload caddy` (or `caddy reload`) after editing the Caddyfile.

### nginx + certbot

The alternative for boxes that already run nginx:

```nginx
server {
    listen 80;
    server_name api.example.com;
    location / {
        proxy_pass http://127.0.0.1:<PORT>;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then obtain and install a certificate, which rewrites the server block to redirect `:80` to
`:443` and add the `ssl_certificate` directives:

```bash
sudo certbot --nginx -d api.example.com
```

Either way:

- Point the API hostname's DNS at the VPS before requesting a certificate.
- Open `80`/`443` in the VPS firewall.
- Do **not** open the app's own `PORT` to the outside world — only the proxy should be
  reachable from off-box. See the verification steps below for how to confirm this.

## End-to-end verification

Run these from a laptop (off-box) once the proxy and DNS are in place, regardless of whether the
app underneath is the systemd-run binary or this Docker container:

```bash
# Public hostname, over TLS, no -k:
curl -i https://<api-host>/health-check
# expect: HTTP/2 200, body "health check success", valid certificate chain

# The app's own port must NOT be reachable directly from outside:
curl http://<vps-ip>:<PORT>/health-check
# expect: connection failure (refused or timed out)
```

Check the certificate's issuer and expiry are sane (`openssl s_client -connect
<api-host>:443 -servername <api-host> </dev/null 2>/dev/null | openssl x509 -noout -issuer
-enddate`), and confirm requests are reaching the app by tailing its logs at the same time — via
`journalctl -u gatherloop-pos-api -f` for the native path, or `docker logs -f
gatherloop-pos-api` for this one.
