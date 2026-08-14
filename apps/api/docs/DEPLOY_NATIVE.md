# Deploying `apps/api` natively on a VPS

This is the primary, automated deployment path for `apps/api`: a statically compiled Go binary,
built in CI, run under a system-level `systemd` unit on the VPS. **No language toolchain is
installed on the VPS.** Node, a JRE and Go are only ever used in GitHub Actions to produce the
binary; the box that serves traffic never runs `npm ci`, `go build`, or the OpenAPI generator.

For the Docker-based alternative (kept for compatibility with the existing Render deployment),
see [`DEPLOY.md`](./DEPLOY.md).

Every merge to `main` that touches `apps/api`, `libs/api-contract`, `go.work`, or
`package-lock.json` now deploys automatically via
[`.github/workflows/deploy-api.yml`](../../../.github/workflows/deploy-api.yml). The workflow
can also be run by hand from the Actions tab (`workflow_dispatch`) — this is how a bad deploy is
recovered: re-run the workflow at a known-good commit. See the design in
[`docs/trd-vps-deployment-automation.md`](../../../docs/trd-vps-deployment-automation.md) for
the full picture.

## Why the VPS never builds anything

`apps/api` cannot even resolve its imports without three toolchains present: `go.work` points
at `libs/api-contract/src/__generated__/go`, a directory that is gitignored and only exists
after `npx nx run api-contract:generate:go` runs — a Java program (`openapi-generator-cli`)
distributed over npm. A fresh clone needs Node, a JRE *and* Go before a single line of Go
compiles.

Running that install-and-compile sequence next to the live API was tried on a comparable small
VPS for a sibling project (`game-master-bell`) and it starved the box and killed the running
process. That is not a risk we are willing to repeat here, especially since our build is even
heavier (three toolchains instead of one). So the rule is unconditional:

> Build in CI. Ship a binary. The VPS holds no toolchain and compiles nothing.

Because `apps/api` already builds with `CGO_ENABLED=0`, the output is a dependency-free static
ELF binary — it runs on any Linux box of the matching architecture with nothing else installed.

## Why a system-level unit, not a user unit

The unit lives in `/etc/systemd/system/` and is managed with plain `systemctl` (`sudo
systemctl restart gatherloop-pos-api`, not `systemctl --user`). This was a deliberate,
learned-the-hard-way choice, not a default:

`game-master-bell` originally ran its deploy under a `systemctl --user` unit. A user unit needs
`loginctl enable-linger` to keep running after the owning session ends, and even with that set,
the service was observed dying minutes after unrelated SSH sessions disconnected — including the
deploy pipeline's own SCP/SSH connections. A system unit is supervised by PID 1 from boot and
does not depend on any user session being active, so it does not have this failure mode.

Docker was also considered and rejected: the binary is already a self-contained static
executable, so a container adds nothing except daemon memory overhead on a small box.

## Filesystem layout on the VPS

```
$VPS_DEPLOY_PATH/                      # e.g. /root/projects/gatherloop-pos
├── .git/                              # cloned once; git fetch + reset --hard on every deploy
├── apps/
│   └── api/
│       ├── deploy/
│       │   └── gatherloop-pos-api.service   # tracked in this repo; copied to /etc on deploy
│       ├── dist/
│       │   └── release/
│       │       ├── api                # the only binary the unit runs
│       │       ├── migrate            # shipped, never invoked by the pipeline
│       │       └── seed               # shipped, never invoked by the pipeline
│       └── .env                       # written by the deploy pipeline on every deploy
└── … the rest of the monorepo, untouched

/etc/systemd/system/gatherloop-pos-api.service   # copy of the tracked unit above
```

Only `apps/api/dist/release/` and `apps/api/.env` are ever written under the checkout. Everything
else is whatever `origin/main` says it is, which is why the checkout should never be hand-edited:
every deploy runs `git reset --hard` and would silently discard local changes to tracked files.

## Prerequisites

- A Linux VPS reachable over SSH. Record its architecture now: `uname -m`. `x86_64` maps to Go's
  `amd64`, `aarch64` maps to `arm64` — this matters later because the CI build's `GOARCH` must
  match, and a mismatch surfaces as `Exec format error` on `systemctl restart` rather than a
  build warning.
- `git`, so the monorepo can be cloned. **No Node, no JRE, no Go.** The only toolchain the box
  ever needs is whatever the reverse proxy requires (covered separately in `DEPLOY.md`).
- A user able to run `systemctl` and write to `/etc/systemd/system/` (via `sudo`, or as `root`
  directly, as used in the paths below).

## One-time setup

1. **Clone the monorepo** to the path that will become `VPS_DEPLOY_PATH`. This example (and the
   unit file below) uses `/root/projects/gatherloop-pos`:

   ```bash
   git clone <repo-url> /root/projects/gatherloop-pos
   ```

2. **Get a build artifact onto the box.** For this first, manual bring-up (before the
   `production` environment and its secrets are configured — see
   [Automated deploy pipeline](#automated-deploy-pipeline) below), trigger the `build` job by
   hand from the Actions tab (`Deploy api to VPS` → `Run workflow`), download the resulting
   `api-deploy` artifact, and untar it into `dist/release/`:

   ```bash
   mkdir -p /root/projects/gatherloop-pos/apps/api/dist/release
   tar -xzf api-deploy.tar.gz -C /root/projects/gatherloop-pos/apps/api/dist/release
   ```

   Confirm the architecture matches the box: `file
   /root/projects/gatherloop-pos/apps/api/dist/release/api` should report the same architecture
   as `uname -m` above.

3. **Write `apps/api/.env`** with the real runtime configuration. This file is never committed.
   Write it by hand for this first bring-up; every automated deploy after that overwrites it from
   the repository secrets listed below:

   ```bash
   cat > /root/projects/gatherloop-pos/apps/api/.env <<'EOF'
   DB_USERNAME=...
   DB_PASSWORD=...
   DB_NAME=...
   DB_HOST=...
   DB_PORT=...
   PORT=...
   JWT_SECRET=...
   APP_ENV=production
   EOF
   ```

4. **Install the systemd unit.** The tracked unit file is
   [`apps/api/deploy/gatherloop-pos-api.service`](../deploy/gatherloop-pos-api.service):

   ```bash
   sudo cp /root/projects/gatherloop-pos/apps/api/deploy/gatherloop-pos-api.service \
     /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable gatherloop-pos-api
   sudo systemctl start gatherloop-pos-api
   ```

   > **The unit's three absolute paths (`WorkingDirectory`, `EnvironmentFile`, `ExecStart`)
   > assume the clone lives at `/root/projects/gatherloop-pos`.** systemd does not interpolate
   > `VPS_DEPLOY_PATH` or any other variable — if the clone lives somewhere else, edit those
   > three lines in the repo's copy of the unit file to match before copying it in. This is the
   > most likely first-deploy failure, so check it first if the service fails to start.

## Automated deploy pipeline

Once the one-time setup below is done, every push to `main` that touches `apps/api/**`,
`libs/api-contract/**`, `go.work`, `package-lock.json`, or the workflow file itself runs
[`.github/workflows/deploy-api.yml`](../../../.github/workflows/deploy-api.yml) end to end. It
can also be triggered by hand from the Actions tab (`Deploy api to VPS` → `Run workflow`) — this
is also how a bad deploy is recovered: re-run the workflow at a known-good commit. There is no
rollback script and no retained release history; a deploy is cheap enough that re-running it is
the recovery mechanism.

The workflow has two jobs:

- **`build`** (`ubuntu-latest`, no secrets) — checks out the repo, installs Node 20 / Java 21 /
  Go (matching `apps/api/go.mod`), runs `npm ci`, generates the Go API-contract package with
  `npx nx run api-contract:generate:go`, lints and tests (`api:lint`, `api:test`), then runs
  `make -C apps/api build-release` and uploads `api-deploy.tar.gz` (the `api`, `migrate`, and
  `seed` binaries) as a build artifact. A failure here stops the pipeline before anything reaches
  the VPS — the running service is untouched.
- **`deploy`** (`needs: build`, `environment: production`) — downloads the artifact, copies it to
  the VPS with `appleboy/scp-action`, then over SSH with `appleboy/ssh-action`: `git fetch` +
  `git reset --hard origin/main` on the tracked checkout, untars the new binaries into
  `apps/api/dist/release/`, rewrites `apps/api/.env` from the repository secrets below, copies
  the tracked unit file into `/etc/systemd/system/`, `daemon-reload`s, `enable`s, and
  `restart`s the service. The last step is a health-check gate: it `curl`s
  `127.0.0.1:$PORT/health-check` with retries and fails the job (printing the last 100 lines of
  `journalctl`) if the service does not come back up — without this, a binary that panics on
  boot would leave a broken deploy looking green.

Only `apps/api/dist/release/` and `apps/api/.env` are written by the pipeline; everything else in
the checkout comes from `git reset --hard origin/main`, which is why the box should never be
hand-edited (see [Filesystem layout](#filesystem-layout-on-the-vps) above).

### Repository secrets

All of the following are **GitHub repository secrets** on the `production` environment. None is
committed to the repo, and the `build` job never sees the `DB_*` or `JWT_SECRET` values — they
are only used by the `deploy` job to write the runtime `.env` on the box.

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS IP or hostname |
| `VPS_PORT` | SSH port |
| `VPS_USERNAME` | deploy user |
| `VPS_SSH_KEY` | private half of the CI-only ed25519 key |
| `VPS_DEPLOY_PATH` | absolute path to the monorepo clone on the VPS (the repo root, not `apps/api`) |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT` | the existing managed MySQL, unchanged |
| `PORT` | local port the API binds |
| `JWT_SECRET` | app config |

`LOG_LEVEL`, `APP_ENV`, and `SERVICE_NAME` are not secrets: `GetEnv()` defaults them to `info`,
`development`, and `gatherloop-pos-api`. The generated `.env` sets `APP_ENV=production`
explicitly (the one default that would otherwise be wrong, since it is stamped onto every log
line) and leaves the other two at their code defaults.

A secret value containing `#`, a newline, or a leading space may not round-trip cleanly through
`.env` parsing (both `godotenv` and systemd's `EnvironmentFile` parse `KEY=value` line by line).
Keep `JWT_SECRET` and `DB_PASSWORD` to URL-safe characters where possible.

### One-time setup for automation

1. **Generate a dedicated CI-only ed25519 keypair** — used for nothing else — and add its public
   half to the deploy user's `~/.ssh/authorized_keys` on the VPS. Revoking CI's access later is
   deleting that one line.
2. **Grant the deploy user passwordless `sudo`** for `systemctl` and for `cp` into
   `/etc/systemd/system/`, since the `deploy` job's SSH script runs those commands with `sudo`.
3. **Create the `production` environment** in the repository's Settings → Environments.
4. **Add every secret in the table above** to that environment.

Once all four are done, the next push to `main` touching the filtered paths deploys
automatically.

## Verifying the install

```bash
systemctl status gatherloop-pos-api      # expect: active (running)
journalctl -u gatherloop-pos-api -n 50   # expect a JSON "server listening" line, "env":"production"
curl -i 127.0.0.1:$PORT/health-check     # expect: 200, body "health check success"
sudo systemctl restart gatherloop-pos-api
systemctl status gatherloop-pos-api      # confirm it comes back up
```

`Restart=always` with `RestartSec=5` means a crash (for example, a lost database connection) is
retried automatically rather than left down.

## Updating the unit file

Because the unit file lives in the tracked checkout, changing
`apps/api/deploy/gatherloop-pos-api.service` in the repo does not take effect until it is
re-copied to `/etc/systemd/system/` and reloaded on the box — steps 4 above, done by hand during
initial bring-up, and by the `deploy` job automatically on every push to `main` after that.

## Reverse proxy and TLS

The app binds `PORT` on `127.0.0.1` and is never exposed directly. A reverse proxy in front of
it terminates TLS, and is the only thing that should be reachable from outside the box. Caddy
and nginx+certbot configurations, plus the end-to-end verification steps (public HTTPS request,
certificate check, confirming `PORT` itself is unreachable off-box), are in
[`DEPLOY.md`](./DEPLOY.md#reverse-proxy-and-tls) — the proxy layer is identical whether the app
runs under this systemd unit or in the Docker container that document also covers, so it is
documented once, there.

## Day-2 operations

Manual redeploy, log tailing, and uptime monitoring — including recovering from a bad deploy —
are covered in [`RUNBOOK.md`](./RUNBOOK.md).
