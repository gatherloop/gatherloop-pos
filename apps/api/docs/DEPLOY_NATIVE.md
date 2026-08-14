# Deploying `apps/api` natively on a VPS

This is the primary, automated deployment path for `apps/api`: a statically compiled Go binary,
built in CI, run under a system-level `systemd` unit on the VPS. **No language toolchain is
installed on the VPS.** Node, a JRE and Go are only ever used in GitHub Actions to produce the
binary; the box that serves traffic never runs `npm ci`, `go build`, or the OpenAPI generator.

For the Docker-based alternative (kept for compatibility with the existing Render deployment),
see [`DEPLOY.md`](./DEPLOY.md).

This document currently covers provisioning and the manual install of the service. The
automated deploy pipeline (the `deploy` job, secrets, and the two-job breakdown) is documented
here once it exists — see the design in
[`docs/trd-vps-deployment-automation.md`](../../../docs/trd-vps-deployment-automation.md) for
the full picture, including phases not yet implemented.

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
│       └── .env                       # written by hand today; by the pipeline from phase 4
└── … the rest of the monorepo, untouched

/etc/systemd/system/gatherloop-pos-api.service   # copy of the tracked unit above
```

Only `apps/api/dist/release/` and `apps/api/.env` are ever written under the checkout. Everything
else is whatever `origin/main` says it is, which is why the checkout should never be hand-edited:
any future `git reset --hard` (once the automated deploy lands) would silently discard local
changes to tracked files.

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

2. **Get a build artifact onto the box.** Until the automated deploy pipeline exists (phase 4),
   trigger the `build` job by hand from the Actions tab (`Deploy api to VPS` → `Run workflow`),
   download the resulting `api-deploy` artifact, and untar it into `dist/release/`:

   ```bash
   mkdir -p /root/projects/gatherloop-pos/apps/api/dist/release
   tar -xzf api-deploy.tar.gz -C /root/projects/gatherloop-pos/apps/api/dist/release
   ```

   Confirm the architecture matches the box: `file
   /root/projects/gatherloop-pos/apps/api/dist/release/api` should report the same architecture
   as `uname -m` above.

3. **Write `apps/api/.env`** with the real runtime configuration. This file is never committed;
   write it by hand for now:

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
re-copied to `/etc/systemd/system/` and reloaded on the box — steps 4 above, repeated by hand
today, and by the deploy pipeline on every future automated run.

## What's not covered here yet

- **The reverse proxy and TLS** — nothing routes public traffic to this instance yet. See
  `DEPLOY.md` once its reverse-proxy section lands.
- **The automated deploy pipeline** — merges to `main` do not yet deploy anywhere;
  `.github/workflows/deploy-api.yml` currently only builds on `workflow_dispatch`. The secrets
  table and the two-job (`build` / `deploy`) breakdown will be documented here once that lands.
- **Day-2 operations** (manual redeploy, log tailing, uptime monitoring) — see `RUNBOOK.md` once
  it exists.
