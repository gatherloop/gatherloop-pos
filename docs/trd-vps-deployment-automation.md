# TRD — VPS Deployment Automation for `apps/api`

**Status:** proposed
**Scope:** `apps/api` only
**Model:** [`gatherloop/game-master-bell`](https://github.com/gatherloop/game-master-bell) — this document is
a translation of that repo's already-working deploy into Go, not a fresh design

---

## 1. Problem statement

`apps/api` is deployed on Render.com today. Render builds the entire monorepo inside a
container using `apps/api/Dockerfile`: it starts from `node:20-alpine`, installs a JRE and Go
with `apk add openjdk21-jre go`, runs `npm install`, generates the Go API-contract package via
`npx nx run api-contract:generate:go`, and only then compiles the Go binary. That works because
Render's builder is a throwaway machine with no other job.

We are moving to our own VPS, and the same build cannot follow us there. Reproducing that
sequence on the target box means installing Node, a JRE and the Go toolchain on it, and then
running `npm install` plus a Java code generator plus a Go compile *next to the live API
process*. On a small VPS that is not a slow deploy, it is an outage: the sibling repo
game-master-bell tried exactly this on a 1GB box and the install-and-compile step starved and
killed the running API. That experience is the origin of every decision below.

The constraint that follows is one line, and everything else in this document is a consequence
of it:

> **Build in CI. Ship a binary. The VPS holds no toolchain and compiles nothing.**

Go makes this unusually cheap for us. `apps/api` already builds with `CGO_ENABLED=0` (set on
the Nx `build` target in `apps/api/project.json`), so its output is a dependency-free static
ELF — a single file that runs on any Linux box of the right architecture with nothing installed
alongside it. game-master-bell had to work to produce a self-contained deliverable
(`pnpm deploy --prod --legacy`, packaging `dist/` plus a fully resolved `node_modules`). We get
the same property for free from the compiler. That is what makes ship-the-binary viable at all
here.

### Why we copy game-master-bell rather than design something

game-master-bell already runs this exact shape in production, and its deploy has already paid
for the mistakes: the user-level systemd unit that kept dying, the on-box build that killed the
API. Where this document had a genuine choice it chose whatever makes the two repos look the
same — same workflow filename, same two-job split, same marketplace actions, same secret names,
same three-document layout under `apps/api/docs/`. A reader who has operated one of these
deploys should recognise the other within a few seconds. Divergence is a cost, and it is only
paid where Go and Node genuinely differ.

---

## 2. Context: the existing system

### What `apps/api` is

A Go 1.24 module (`module apps/api`, `toolchain go1.24.7`) joined to the workspace by the root
`go.work`, which is exactly two `use` lines:

```
use ./apps/api
use ./libs/api-contract/src/__generated__/go
```

It contains **three `main` packages**:

| Binary | Source | Role |
|---|---|---|
| `api` | `apps/api/main.go` | the HTTP server |
| `migrate` | `apps/api/cmd/migrate/main.go` | applies embedded schema migrations |
| `seed` | `apps/api/cmd/seed/main.go` | seeds development data |

Migrations are **embedded** — `apps/api/migrations/embed.go` is a `//go:embed *.sql` of the
`migrations/` directory — so the `migrate` binary carries its own SQL and needs no files and no
toolchain on the target machine.

Configuration is env-var-only. `utils.LoadEnv()` (`apps/api/utils/env.go`) is a one-line
`godotenv.Load()`, and `main.go` treats its error as non-fatal: it only logs `"loaded .env
file"` when the call *succeeded*. A missing `.env` is therefore already a supported state, and
the process reads its configuration from the ambient environment. `utils.GetEnv()` reads
`DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT`, `PORT` and `JWT_SECRET` with no
defaults, and `SERVICE_NAME`, `APP_ENV` and `LOG_LEVEL` with code defaults of
`gatherloop-pos-api`, `development` and `info`.

Logging is structured JSON on stdout: `logger.New` builds a `slog.NewJSONHandler(os.Stdout,
…)` decorated with `service` and `env`. It writes to a stream, not a file, and it never opens a
log destination of its own.

Those two facts together are what make this migration small. A systemd `EnvironmentFile` is a
drop-in replacement for Render's environment-variable UI, and journald is a drop-in replacement
for Render's log tab, with **no application code change on either side**.

There is already a health endpoint. `apps/api/main.go` registers:

```go
router.HandleFunc("/health-check", func(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("health check success"))
})
```

An unadorned `Write` with no `WriteHeader`, so it answers `200` with the body
`health check success`. We do not need to add a health check; we only need to start using it.

### Why the build needs Node and Java

This is the single strongest argument for building in CI, and it deserves stating plainly.

`libs/api-contract/src/__generated__` is **gitignored** (`.gitignore:121` ignores
`__generated__`). The Go package that `apps/api` imports through `go.work` therefore does not
exist in a fresh clone. It is produced by the Nx target `api-contract:generate:go`, whose
command is:

```
rm -rf src/__generated__/go && openapi-generator-cli generate -g go -o src/__generated__/go \
  -i src/api.yaml --additional-properties=packageName=apiContract
```

`openapi-generator-cli` is a **Java** program distributed over **npm** — `openapitools.json`
pins generator version `7.9.0`, and the wrapper is installed by `npm ci` from the root
`package-lock.json`, then runs on a JVM.

So a fresh clone of this repo cannot even *resolve the imports* of `apps/api` — never mind
compile it — without Node, a JRE and Go all present. The `go.work` file references a directory
that does not exist yet. Three toolchains and an `npm ci` are the price of entry to a build,
and that is precisely the workload we refuse to put on the box that is serving traffic.

### How the frontends reach the API today

- **Web** — `apps/web/next.config.js` rewrites `/api/:path*` to
  `process.env.NEXT_PUBLIC_API_BASE_URL + '/:path*'`. The browser-side axios client
  (`libs/api-contract/src/client.ts`) points at `NEXT_PUBLIC_API_PROXY_BASE_URL`, i.e. the
  Next proxy path, so only the server-side rewrite target names the API host.
- **Mobile** — the same client falls back to `Config['API_BASE_URL']` from
  `react-native-config`; `apps/mobile/.env.example` declares `API_BASE_URL=`.

Cutover is therefore **DNS plus one environment variable per client**. No client code changes.

### What exists in CI today

One workflow: `.github/workflows/deploy-docs.yaml`, which builds `docs-site/` and publishes it
to GitHub Pages. There is no workflow that touches `apps/api`. The repo uses **npm** (root
`package-lock.json`), not pnpm, and pins no Node version — there is no `.nvmrc` and no
`engines` field — so CI must state `node-version: 20` explicitly, matching the `node:20-alpine`
base the Dockerfile already uses.

---

## 3. Goals

1. Every merge to `main` that touches the API deploys it to the VPS, unattended.
2. The VPS runs a compiled binary and installs no language toolchain.
3. A failed build or a process that does not come back up turns the GitHub Actions run **red**,
   rather than failing silently.
4. No secret is committed to the repository or baked into the build artifact.
5. The deploy is recognisably the same deploy as game-master-bell's, so operating both costs
   little more than operating one.

## 4. Non-goals

- **Running database migrations.** Schema changes are applied manually by the operator, outside
  this pipeline.
- Multi-node, load-balanced, or blue/green deployment. One VPS, one process.
- Migrating the MySQL database. `DB_HOST` is already an env var; the API keeps connecting to
  the existing managed instance.
- A staging tier. Production only, matching the current single-service Render shape.
- Deploying `apps/web` or `apps/mobile`.
- Removing `apps/api/Dockerfile`. It stays: it backs the documented Docker alternative and the
  current Render deployment until cutover is finished.
- Changing the CORS middleware or any application behaviour.

---

## 5. Decisions

Each row is a decision with a reason. Rows 1 and 2 were learned in production in
game-master-bell and are not open preferences.

| # | Decision | Rationale |
|---|---|---|
| 1 | **The VPS never builds anything.** CI compiles; the deploy ships binaries and restarts a service. | game-master-bell ran the install and compiler next to the live API on a 1GB box and the build starved and killed the API. Non-negotiable. Here the cost would be worse — see §2, the build needs Node, a JRE *and* Go before imports even resolve. |
| 2 | **A system-level systemd unit** in `/etc/systemd/system/`, managed with plain `systemctl`. | Deliberately not `systemctl --user`: a user unit needs `loginctl enable-linger`, and in game-master-bell's production it still died minutes after unrelated SSH sessions disconnected — including the deploy's own SCP/SSH connections. A system unit is supervised by PID 1 from boot and does not care who is logged in. Deliberately not Docker either: the artifact is already self-contained, so a container buys nothing and costs daemon memory on a small box. |
| 3 | **A git checkout of the monorepo lives on the VPS** at `VPS_DEPLOY_PATH`, `git fetch`ed and `git reset --hard origin/main`ed at the start of every deploy. | That checkout is how tracked, non-built files reach the box — above all the unit file. The unit is re-copied and `daemon-reload`ed on *every* deploy, so editing `apps/api/deploy/gatherloop-pos-api.service` in the repo takes effect on the next merge to `main` with no manual step on the VPS. |
| 4 | **Secrets live only in GitHub Secrets**, written to `apps/api/.env` on the box by a quoted heredoc on every deploy. | Nothing secret is committed and nothing secret enters the build artifact, so the artifact is safe to download from the Actions UI. Rotation is editing a repo secret and re-running the workflow. |
| 5 | **A reverse proxy (Caddy or nginx) terminates TLS** in front of the app's local port. | The Go process binds a local port and is never exposed directly; certificates, HTTP/2 and redirects are the proxy's job, not the app's. Identical to game-master-bell, so the proxy configuration is literally the same file with a different upstream port. |
| 6 | **Build three binaries — `api`, `migrate`, `seed` — but invoke only `api`.** | One extra line in the Makefile puts a version-matched migrator on the box for the day it is wanted. Migrations are embedded, so the binary is self-sufficient. Shipped, never invoked by the pipeline. |
| 7 | **A health-check gate after `systemctl restart`.** | The one thing this design adds beyond game-master-bell. It costs a single `curl` line, and without it a binary that panics on boot leaves a red-hot broken deploy looking green. Reasons in §9.6. |
| 8 | **Recovery from a bad deploy is re-running the workflow at a known-good SHA.** | No staged swap, no retained release history, no rollback script. A deploy is ~10s of `git reset` plus untar plus restart; re-running it from a good commit is faster to execute and far cheaper to maintain than any of the alternatives. |
| 9 | **Mirror game-master-bell's names, files and layout wherever the two repos overlap.** | `deploy-api.yml`, the `build`/`deploy` job split, `appleboy/scp-action@v1` + `appleboy/ssh-action@v1`, `environment: production`, `retention-days: 1`, the `VPS_*` secret names, and the `DEPLOY_NATIVE.md` / `DEPLOY.md` / `RUNBOOK.md` trio. | Two deploys that look identical cost roughly one deploy to operate. Divergence is only paid where Go and Node genuinely differ (three toolchains instead of one; a bare `ExecStart` instead of an nvm bootstrap). |

---

## 6. Target architecture

```
   push to main (paths: apps/api/**, libs/api-contract/**,
                        go.work, package-lock.json, workflow)
                    │
                    ▼
  ┌──────────────────────────────────────────────────┐
  │  GitHub Actions — job: build (ubuntu-latest)     │
  │    checkout                                      │
  │    setup-node 20 · setup-java 21 · setup-go      │
  │    npm ci                                        │
  │    nx run api-contract:generate:go   (JVM)       │
  │    nx run api:lint · api:test                    │
  │    make build-release  → api · migrate · seed    │
  │    tar → api-deploy.tar.gz  (upload-artifact)    │
  └──────────────────────────────────────────────────┘
                    │  needs: build
                    ▼
  ┌──────────────────────────────────────────────────┐
  │  job: deploy   (environment: production)         │
  │    download-artifact                             │
  │    appleboy/scp-action  ──── tarball ──► /tmp    │
  │    appleboy/ssh-action  ──── script  ──►         │
  └──────────────────────────────────────────────────┘
                    │ ssh
                    ▼
  ══════════════════ VPS ═══════════════════════════════════
                                                            
   git checkout of monorepo at $VPS_DEPLOY_PATH             
     git fetch && git reset --hard origin/main              
     untar binaries → apps/api/dist/release/                
     write apps/api/.env from GitHub Secrets                
     cp unit → /etc/systemd/system/ · daemon-reload         
     systemctl restart gatherloop-pos-api                   
     curl 127.0.0.1:$PORT/health-check  ← gate              
                                                            
   :443 ┌─────────┐        ┌──────────────────────┐         
   ────►│  Caddy  │───────►│ gatherloop-pos-api   │         
    TLS │ (nginx) │  :PORT │ static Go binary     │         
        └─────────┘  local │ under systemd        │         
                           └──────────┬───────────┘         
                                      │ stdout (JSON)       
                                      ▼                     
                                  journald                  
  ═══════════════════════════════════│═══════════════════════
                                     │ TCP
                                     ▼
                        managed MySQL (unchanged, $DB_HOST)
```

### Filesystem layout on the VPS

```
$VPS_DEPLOY_PATH/                      # e.g. /root/projects/gatherloop-pos
├── .git/                              # cloned once, reset --hard on every deploy
├── apps/
│   └── api/
│       ├── deploy/
│       │   └── gatherloop-pos-api.service   # tracked; copied to /etc on every deploy
│       ├── dist/
│       │   └── release/
│       │       ├── api                # ← the only binary the unit runs
│       │       ├── migrate            # ← shipped, never invoked by the pipeline
│       │       └── seed               # ← shipped, never invoked by the pipeline
│       └── .env                       # written from GitHub Secrets on every deploy
└── … the rest of the monorepo, untouched

/etc/systemd/system/gatherloop-pos-api.service   # copy of the tracked unit
```

Only `apps/api/dist/release/` and `apps/api/.env` are ever written on the box. Everything else
under `$VPS_DEPLOY_PATH` is whatever `origin/main` says it is — which is why `git reset --hard`
is safe there and why nobody should hand-edit files in that checkout.

---

## 7. Detailed design

### 7.1 The `build` job

Three toolchains, for the reasons in §2. Their versions are chosen to match what
`apps/api/Dockerfile` already installs, so CI and the Docker path do not drift:

| Toolchain | Version | Why |
|---|---|---|
| Node | 20 | `npm ci` and the Nx CLI; matches `node:20-alpine` in the Dockerfile. No `.nvmrc` or `engines` field exists, so the version must be stated explicitly. |
| Java | Temurin 21 | `openapi-generator-cli` (pinned to 7.9.0 in `openapitools.json`) is a JVM program; the Dockerfile installs `openjdk21-jre`. |
| Go | from `apps/api/go.mod` | `go-version-file` keeps CI on whatever the module declares (1.24.0 / toolchain 1.24.7) without a second place to update. |

The lint and test steps use the existing Nx targets — `api:lint` and `api:test`, both
`@nx-go/nx-go` executors declared in `apps/api/project.json`. This mirrors game-master-bell's
`eslint` → `typecheck` → `test` gate: broken code should fail in CI, before anything is copied
to a server. Note that `api:lint` and `api:test` do **not** declare a dependency on
`api-contract:generate:go` (only `build` and `serve` do), so the generate step must be invoked
explicitly before them — which the sketch below does.

### 7.2 Build changes in `apps/api/Makefile`

**A real bug to fix first.** `apps/api/Makefile` line 4 is:

```make
include .env
export
```

Unprefixed `include` is fatal in GNU Make when the file is absent, so *every* target in this
Makefile — `build`, `test`, `dev`, all of them — fails on any machine without an `apps/api/.env`.
That includes a fresh clone, and it includes CI. The fix is one character:

```make
-include .env
export
```

With the dash, a missing `.env` is silently skipped and the variables fall through to the
ambient environment, which is exactly the behaviour `utils.GetEnv()` already expects. This must
land before any CI job can call `make`.

**The new target.** CI and a laptop should produce byte-comparable output, so the build flags
live in the Makefile rather than in the workflow:

```make
RELEASE_DIR    ?= dist/release
RELEASE_GOOS   ?= linux
RELEASE_GOARCH ?= amd64
RELEASE_BUILD  := CGO_ENABLED=0 GOOS=$(RELEASE_GOOS) GOARCH=$(RELEASE_GOARCH) \
                  go build -trimpath -ldflags "-s -w"

## build-release: Build the three static release binaries for the VPS
build-release:
	mkdir -p $(RELEASE_DIR)
	$(RELEASE_BUILD) -o $(RELEASE_DIR)/api main.go
	$(RELEASE_BUILD) -o $(RELEASE_DIR)/migrate cmd/migrate/main.go
	$(RELEASE_BUILD) -o $(RELEASE_DIR)/seed cmd/seed/main.go
```

Add `build-release` to the `.PHONY` list.

> The variables are named `RELEASE_GOOS` / `RELEASE_GOARCH`, not `GOOS` / `GOARCH`, on purpose.
> Line 5 of this Makefile is a bare `export`, which exports **every** Make variable into the
> environment of **every** recipe — so a variable literally named `GOOS` would silently
> cross-compile `make dev`, `make build` and `make test` for Linux too, breaking all three on a
> macOS laptop. Keeping the cross-compilation confined to the recipe that wants it avoids that
> entirely. `CGO_ENABLED=0` matches what
`apps/api/project.json` already sets on the Nx `build` target and is what makes the output a
dependency-free static ELF; `-trimpath` and `-ldflags "-s -w"` strip build paths and debug
symbols, which shrinks the artifact and removes machine-specific paths from it.

> **`GOARCH` must match the VPS.** `amd64` is the default because it is the common case, but a
> mismatch is not a warning — it is `Exec format error` on `systemctl restart`, after the
> deploy has already replaced the previous binary. Record `uname -m` on the VPS as a
> provisioning step (`x86_64` → `amd64`, `aarch64` → `arm64`) and set `GOARCH` in the workflow
> if it is not `amd64`.

### 7.3 Secrets

Named to match game-master-bell exactly wherever the two overlap. All are GitHub repository
secrets; none appears in the repo, and none is placeholder-substituted anywhere but at deploy
time.

| Secret | Value |
|---|---|
| `VPS_HOST` | VPS IP or hostname |
| `VPS_PORT` | SSH port |
| `VPS_USERNAME` | deploy user |
| `VPS_SSH_KEY` | private half of the CI-only ed25519 key |
| `VPS_DEPLOY_PATH` | absolute path to the **monorepo** clone on the VPS — the repo root, not `apps/api` |
| `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT` | the existing managed MySQL, unchanged |
| `PORT` | local port the API binds |
| `JWT_SECRET` | app config |

`LOG_LEVEL`, `APP_ENV` and `SERVICE_NAME` are not secrets and mostly not needed: `GetEnv()`
defaults them to `info`, `development` and `gatherloop-pos-api`. The generated `.env` sets
`APP_ENV=production` — the one default that is wrong in production, since it is stamped onto
every log line — and leaves the other two at their code defaults.

The SSH key is a **dedicated ed25519 keypair generated for CI and used for nothing else**, with
the public half in the deploy user's `authorized_keys`. Revoking CI access is deleting one
line from that file.

**CI needs no database credentials on the build path.** The `build` job compiles and tests; it
never connects to MySQL. The DB secrets exist only to be written into the runtime `.env` on the
box.

### 7.4 The deploy workflow — shape, not a final file

Below is the shape of `.github/workflows/deploy-api.yml`. It is deliberately close to
game-master-bell's file so the two can be diffed against each other. **This is a sketch to fill
in, not a byte-final file** — action versions, step names and the exact `.env` body are for the
implementing PR to settle.

```yaml
name: Deploy api to VPS

on:
  push:
    branches: [main]
    paths:
      - "apps/api/**"
      - "libs/api-contract/**"
      - "go.work"
      - "package-lock.json"
      - ".github/workflows/deploy-api.yml"
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      # openapi-generator-cli is a Java program shipped over npm.
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21

      - uses: actions/setup-go@v5
        with:
          go-version-file: apps/api/go.mod
          cache-dependency-path: apps/api/go.sum

      - run: npm ci

      # libs/api-contract/src/__generated__ is gitignored; apps/api cannot
      # resolve its imports until this runs. See docs/trd-vps-deployment-automation.md §2.
      - run: npx nx run api-contract:generate:go

      - run: npx nx run api:lint
      - run: npx nx run api:test

      - run: make -C apps/api build-release
      - run: tar -czf api-deploy.tar.gz -C apps/api/dist/release .

      - uses: actions/upload-artifact@v4
        with:
          name: api-deploy
          path: api-deploy.tar.gz
          retention-days: 1

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: api-deploy

      - name: Copy build artifact to VPS
        uses: appleboy/scp-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          port: ${{ secrets.VPS_PORT }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "api-deploy.tar.gz"
          target: "/tmp"

      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          port: ${{ secrets.VPS_PORT }}
          username: ${{ secrets.VPS_USERNAME }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            set -e
            cd ${{ secrets.VPS_DEPLOY_PATH }}
            git fetch origin main
            git reset --hard origin/main
            rm -rf apps/api/dist/release
            mkdir -p apps/api/dist/release
            tar -xzf /tmp/api-deploy.tar.gz -C apps/api/dist/release
            rm -f /tmp/api-deploy.tar.gz
            cat > apps/api/.env <<'ENV_EOF'
            DB_USERNAME=${{ secrets.DB_USERNAME }}
            DB_PASSWORD=${{ secrets.DB_PASSWORD }}
            DB_NAME=${{ secrets.DB_NAME }}
            DB_HOST=${{ secrets.DB_HOST }}
            DB_PORT=${{ secrets.DB_PORT }}
            PORT=${{ secrets.PORT }}
            JWT_SECRET=${{ secrets.JWT_SECRET }}
            APP_ENV=production
            ENV_EOF
            sudo cp apps/api/deploy/gatherloop-pos-api.service /etc/systemd/system/
            sudo systemctl daemon-reload
            sudo systemctl enable gatherloop-pos-api
            sudo systemctl restart gatherloop-pos-api
            curl --retry 5 --retry-delay 2 --fail \
              http://127.0.0.1:${{ secrets.PORT }}/health-check \
              || { sudo journalctl -u gatherloop-pos-api -n 100 --no-pager; exit 1; }
```

Reading it against the reference line by line: `set -e`, `cd $VPS_DEPLOY_PATH`, fetch and hard
reset, delete the previous build output, untar the artifact, delete the tarball, write `.env`
from a **quoted** heredoc, `sudo cp` the unit into `/etc/systemd/system/`, `daemon-reload`,
`enable`, `restart`. The only additions are the untar path (a `dist/release` directory instead
of `dist` + `node_modules`) and the health-check gate.

The heredoc delimiter is quoted (`<<'ENV_EOF'`) on purpose. GitHub substitutes the `${{ }}`
expressions into the script text before it is sent, so quoting stops the *remote shell* from
re-expanding a `$` that happens to appear inside a secret value.

Note that nothing here mentions `migrate` or `seed`. The binaries land on the box; the pipeline
never runs them. Migrations are the operator's, applied by hand.

### 7.5 The systemd unit — `apps/api/deploy/gatherloop-pos-api.service`

Same shape as game-master-bell's unit, minus the runtime bootstrap. Theirs has to source nvm
and pick a Node version before `exec node dist/server.js`; a static Go binary needs none of
that, so `ExecStart` is simply the binary:

```ini
[Unit]
Description=Gatherloop POS API
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/projects/gatherloop-pos/apps/api
EnvironmentFile=/root/projects/gatherloop-pos/apps/api/.env
ExecStart=/root/projects/gatherloop-pos/apps/api/dist/release/api
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> **The three absolute paths assume the clone lives at `/root/projects/gatherloop-pos`.** They
> are not derived from `VPS_DEPLOY_PATH` — systemd does not interpolate. If the clone lives
> anywhere else, `WorkingDirectory`, `EnvironmentFile` and `ExecStart` must be edited in the
> repo to match, and the change reaches the box on the next deploy (decision 3). This is worth
> a comment in `DEPLOY_NATIVE.md` because it is the most likely first-deploy failure.

`Restart=always` with `RestartSec=5` means a crash is retried rather than left down —
appropriate for a process whose usual failure is a lost database connection. `WorkingDirectory`
being `apps/api` also means `godotenv.Load()` finds the same `.env` that systemd already read
via `EnvironmentFile`; the two agree, and neither depends on the other.

### 7.6 Reverse proxy

The app binds `PORT` locally and is never exposed. Caddy is the shorter option and gets
certificates automatically:

```caddy
api.example.com {
    reverse_proxy 127.0.0.1:<PORT>
}
```

The nginx + certbot equivalent is the alternative for boxes that already run nginx. Both
configurations belong in `apps/api/docs/DEPLOY.md` (§8), which `DEPLOY_NATIVE.md` links to
rather than duplicating — the proxy layer is identical whether the app runs under systemd or in
a container, which is exactly how game-master-bell splits the two documents.

### 7.7 Observability

None of this needs code. The process writes structured JSON to stdout (§2), systemd captures
stdout, journald stores it. Operationally:

```bash
journalctl -u gatherloop-pos-api -f            # tail
journalctl -u gatherloop-pos-api -n 100        # recent
systemctl status gatherloop-pos-api            # state, PID, uptime, last exit
```

Uptime monitoring is an external HTTP monitor against the public `/health-check`, with a
self-hosted cron check as the no-third-party alternative. Either way the alert path must be
proven to fire once — deliberately break the check and confirm the notification arrives —
before monitoring is called live. Details go in `RUNBOOK.md` (§8).

---

## 8. Documentation to be produced

This TRD specifies these; the implementation writes them. Mirrors game-master-bell's
three-document layout, including the filenames, so the two repos' `apps/api/docs/` directories
line up.

**`apps/api/docs/DEPLOY_NATIVE.md`** — the automated path and the primary document. Covers: VPS
prerequisites (notably that **no Node, Java or Go is needed on the box** — only the reverse
proxy); the one-time monorepo clone at `VPS_DEPLOY_PATH`; why this is a system unit and not a
user unit, with the linger/SSH-disconnect history; why the VPS never builds; what each of the
two workflow jobs does; one-time VPS prep (clone, passwordless `sudo` for `systemctl` and for
`cp` into `/etc/systemd/system/`, a dedicated ed25519 deploy key with the public half
authorised); the repository-secrets table from §7.3; and verification via `journalctl`,
`systemctl status` and the health check.

**`apps/api/docs/DEPLOY.md`** — the Docker path, kept as a documented alternative on top of the
existing `apps/api/Dockerfile`, opening with a clear note that **this is not the automated
path**. Holds the Caddy and nginx+certbot reverse-proxy configurations and the end-to-end
verification section, both of which `DEPLOY_NATIVE.md` links to rather than repeating.

**`apps/api/docs/RUNBOOK.md`** — day-2 operations: manual redeploy (re-run the workflow from
the Actions tab, `workflow_dispatch`), log tailing, and uptime monitoring for
`GET /health-check` — external monitor recommended, self-hosted cron as the alternative,
including proving the alert path fires once before calling monitoring live. **No migration
procedure**; migrations are out of scope (§4).

Plus cross-links from the root `README.md`, and from `docs-site/` if a natural operations page
exists (`docs-site/under-the-hood/` is the likely home; its nav lives in
`docs-site/.vitepress/config.ts`).

---

## 9. Implementation phases

The work is broken into phases so that **each phase is exactly one small, reviewable pull
request**. This is not bookkeeping: the phase list is how the work gets executed, and a phase
too big to review in one sitting is a defect in *this document*, to be split here rather than
discovered halfway through the branch.

**Rules every phase satisfies**, stated up front so a reader can check the phases against them:

1. **One PR per phase.** If a phase would obviously split into two PRs, it is two phases.
2. **Ordered by dependency, never forward-looking.** A phase may rely on everything before it
   and nothing after it.
3. **`main` stays working after every phase.** No phase leaves the repo half-wired — no
   workflow that fires on push before it is complete, no unit file referencing a binary nothing
   builds, no document linking to a file that does not exist. Where a phase must land inert to
   be safe, it says how it is kept inert.
4. **Production-affecting phases are marked.** Most of these touch nothing in production; the
   ones that do are flagged 🔴 and should be obvious at a glance.
5. **Aborting is reverting.** Each phase states whether `git revert` of the PR fully undoes it,
   and names the extra manual step where it does not.

---

### Phase 1 — Build in CI, no deploy

| | |
|---|---|
| **Repo changes** | `apps/api/Makefile` (`-include .env`; add `build-release` and its `.PHONY` entry); new `.github/workflows/deploy-api.yml` containing **only** the `build` job, with **`workflow_dispatch` as the sole trigger**. |
| **Operator steps** | None. |
| **Production impact** | None. Nothing is copied anywhere; no secret is read. |
| **Demoable outcome** | Trigger the workflow from the Actions tab. It goes green and attaches `api-deploy.tar.gz`. Download it; `tar -tzf` lists exactly `api`, `migrate`, `seed`, and `file api` reports `ELF 64-bit LSB executable, x86-64 … statically linked`. |
| **How to verify** | `make -C apps/api build-release` succeeds on a clean checkout with **no `apps/api/.env` present** — that is the regression test for the `include` bug. Then confirm the reported architecture matches `uname -m` on the target VPS. |
| **Revert = undo?** | Yes, completely. |

The `workflow_dispatch`-only trigger is what keeps `main` safe here: the workflow exists and is
exercisable, but nothing fires it automatically and there is no `deploy` job to fire.

---

### Phase 2 — The unit file, and the VPS brought up by hand 🔴

| | |
|---|---|
| **Repo changes** | New `apps/api/deploy/gatherloop-pos-api.service`; first cut of `apps/api/docs/DEPLOY_NATIVE.md` (prerequisites, clone, why a system unit, why the VPS never builds, manual install steps). |
| **Operator steps** | Provision the VPS; record `uname -m`; clone the monorepo to `VPS_DEPLOY_PATH`; download the phase-1 artifact and untar it into `apps/api/dist/release/`; hand-write `apps/api/.env` with the real DB credentials, `PORT` and `JWT_SECRET`; `sudo cp` the unit into `/etc/systemd/system/`; `daemon-reload`, `enable`, `start`. |
| **Production impact** | 🔴 A second instance of the API now runs against the **live database**, alongside Render. It is read-write, so treat it as production from this moment. Nothing routes traffic to it yet. |
| **Demoable outcome** | On the VPS: `curl -i 127.0.0.1:$PORT/health-check` returns `200` with body `health check success`. |
| **How to verify** | `systemctl status gatherloop-pos-api` shows `active (running)`; `journalctl -u gatherloop-pos-api -n 50` shows the JSON `server listening` line with `"env":"production"`; `sudo systemctl restart` and confirm it comes back. |
| **Revert = undo?** | Reverting the PR removes the tracked unit file but **not** the installed one. Manual undo: `sudo systemctl disable --now gatherloop-pos-api && sudo rm /etc/systemd/system/gatherloop-pos-api.service && sudo systemctl daemon-reload`. |

The unit file lands here rather than in phase 1 because it is only meaningful once a binary
exists to point it at — a unit committed before phase 1 would reference a path nothing produces,
breaking rule 3.

---

### Phase 3 — Reverse proxy and TLS 🔴

| | |
|---|---|
| **Repo changes** | The reverse-proxy section of `apps/api/docs/DEPLOY.md` (Caddy and nginx+certbot), and a link to it from `DEPLOY_NATIVE.md`. Documentation only. |
| **Operator steps** | Install and configure Caddy (or nginx + certbot) with the local `PORT` as upstream; point the API hostname's DNS at the VPS; open 80/443 and confirm `PORT` itself is **not** reachable from outside. |
| **Production impact** | 🔴 A public hostname now serves the API. Existing clients still point at Render, so no user traffic moves yet. |
| **Demoable outcome** | From a laptop: `curl -i https://<api-host>/health-check` returns `200`, body `health check success`, over a valid certificate (no `-k`). |
| **How to verify** | The cert chain validates and the issuer/expiry are sane; `curl http://<vps-ip>:<PORT>/health-check` from off-box **fails** to connect, proving the app is not directly exposed. |
| **Revert = undo?** | The PR is documentation, so reverting is trivial and inconsequential. Undoing the operator work means stopping the proxy and removing the DNS record. |

---

### Phase 4 — Automate the deploy 🔴

| | |
|---|---|
| **Repo changes** | Adds the `deploy` job to `.github/workflows/deploy-api.yml` — `needs: build`, `environment: production`, `download-artifact`, `appleboy/scp-action@v1`, `appleboy/ssh-action@v1` with the inline script from §7.4 including the health-check gate — and switches the trigger to `push` on `main` (with the §7.4 path filters) **plus** `workflow_dispatch`. Extends `DEPLOY_NATIVE.md` with the secrets table and the description of the two jobs. |
| **Operator steps** | Generate the CI-only ed25519 keypair and authorise the public half for the deploy user; grant that user passwordless `sudo` for `systemctl` and for `cp` into `/etc/systemd/system/`; create the `production` environment in repository settings; add all the §7.3 secrets. |
| **Production impact** | 🔴 **This is the phase that makes merges deploy.** From here on, any merge to `main` touching the filtered paths restarts the production API. |
| **Demoable outcome** | Merge a trivial API change. The workflow goes green, and on the VPS the mtime of `apps/api/dist/release/api` is the time of the run while `/health-check` still answers `200`. Then, on a scratch branch, push a deliberately broken Go file and `workflow_dispatch` it: the `build` job fails, the `deploy` job never starts, and the running service is untouched. |
| **How to verify** | Confirm the run log shows the `curl --retry` step succeeding. Separately, prove the gate itself works — point `PORT` at a wrong value in the secrets for one manual run and confirm the job goes **red** with 100 lines of `journalctl` in the log, then restore it. |
| **Revert = undo?** | Reverting the PR stops future automatic deploys, which is the important half. It does **not** roll back the binary already on the box; that is a `workflow_dispatch` re-run at a known-good SHA (decision 8). Secrets and the deploy key stay until removed by hand. |

Phase 4 depends on phases 1–3 and nothing later: it needs the artifact (1), the installed
service and clone (2), and a working public endpoint to have been proven once (3).

---

### Phase 5 — Cutover and documentation 🔴

| | |
|---|---|
| **Repo changes** | Point the clients at the new host — `NEXT_PUBLIC_API_BASE_URL` for `apps/web`'s rewrite and `API_BASE_URL` for `apps/mobile` (`.env.example` and deployment config; **no source changes**, see §2). Finish `apps/api/docs/DEPLOY.md` as the documented Docker alternative with its "not the automated path" note, write `apps/api/docs/RUNBOOK.md`, and add cross-links from the root `README.md` and `docs-site/`. |
| **Operator steps** | Set the new base URL in the web host's environment; rebuild/ship the mobile config; watch both for a settling period; then suspend or delete the Render service. |
| **Production impact** | 🔴 Real user traffic moves to the VPS. |
| **Demoable outcome** | The deployed web app performs a full login-and-transaction flow against the VPS API, and the Render service is off — with the VPS's `journalctl` showing the corresponding request log lines. |
| **How to verify** | Confirm real request traffic in `journalctl -u gatherloop-pos-api -f` from a browser session; confirm Render shows no traffic before it is turned off; click every documentation cross-link. |
| **Revert = undo?** | Reverting the PR restores the old URLs in the repo, but cutover is completed by environment variables and by turning Render off. Rollback is re-pointing `NEXT_PUBLIC_API_BASE_URL` / `API_BASE_URL` at Render and resuming that service — which is why Render is *suspended* first and deleted only after a settling period, and why `apps/api/Dockerfile` is not removed. |

If the `docs-site` cross-link turns out to need a new page rather than a line on an existing
one, split that off as its own trailing PR rather than growing this one.

---

## 10. Risks and trade-offs

These are accepted, not solved. Each row says what we are exposed to and what we would do
about it if the exposure ever became real.

| Risk | Assessment |
|---|---|
| **SSH host keys are not pinned.** `appleboy/scp-action` and `appleboy/ssh-action` accept whatever host key the server presents. | Someone able to impersonate the VPS's IP to a GitHub runner receives the tarball and the `.env` secrets. That requires control of the network path or of DNS/routing to the host — a materially different attacker from "can open a PR". Accepted for now; turning pinning on later is adding the box's public key as a secret and passing it as the actions' `fingerprint` input. Listed as a follow-up (§11). |
| **A restart is a brief outage.** One process, `systemctl restart`, no draining. | Sub-second for a Go binary with no warm-up, on a single-tenant internal POS. Blue/green or a staged swap would remove it and would cost far more than the gap is worth. Accepted deliberately (decision 8). |
| **`git reset --hard` on the VPS destroys local edits under `$VPS_DEPLOY_PATH`.** | That is the point — the checkout is a mirror of `origin/main`, not a workspace. The two files that are *not* tracked (`apps/api/.env` and `apps/api/dist/release/`) are untouched by `reset --hard` and rewritten by the deploy anyway. Documented loudly in `DEPLOY_NATIVE.md`: never hand-edit that checkout. |
| **`GOARCH` mismatch bricks the restart.** | `Exec format error`, after the old binary has already been replaced. The health-check gate catches it and turns the run red with logs, but the service is down until a corrected build ships. Mitigated by recording `uname -m` at provisioning (§7.2). |
| **A secret value containing `#`, a newline, or a leading space may not round-trip through `.env`.** | Both godotenv and systemd's `EnvironmentFile` parse `KEY=value` line-wise and treat some characters specially. Concretely: keep `JWT_SECRET` and `DB_PASSWORD` to URL-safe characters, or quote the value in the heredoc. Worth one sentence in `DEPLOY_NATIVE.md` beside the secrets table. |
| **The deploy user has passwordless `sudo` for `systemctl` and for writing `/etc/systemd/system/`.** | Anyone holding the CI private key can install an arbitrary unit and run it as root. That is inherent to a CI-driven system-unit deploy, and narrowing it further (a separately provisioned privileged helper script, a second Unix user) was considered and rejected as more moving parts than the threat justifies for a single-tenant box. Mitigation is that the key is CI-only and revocable by deleting one `authorized_keys` line. |
| **The build depends on `openapi-generator-cli` resolving over npm and running on a JVM.** | An npm or Maven-Central outage fails the `build` job — which is the correct failure mode, since it fails *before* anything reaches the VPS. The generator version is pinned (`openapitools.json` → 7.9.0), so this is availability risk, not drift risk. |
| **CI and the Dockerfile pin toolchain versions in two places.** | Node 20 and Java 21 are stated in both `apps/api/Dockerfile` and the new workflow, and can drift. Accepted: the Dockerfile is the alternative path, exercised rarely, and unifying them costs more than an occasional bump. §7.1 records the intent that they match. |
| **Bad-deploy recovery is manual.** | No rollback script, no retained release history. Recovery is re-running the workflow with `workflow_dispatch` at a known-good SHA — one action in the Actions tab, and the honest measure of a deploy this small. |

---

## 11. Follow-ups

Deliberately deferred, each cheap to add later:

- **SSH host key pinning.** Store the VPS's public host key as a repository secret and pass it
  as the `fingerprint` input to both appleboy actions. Blast radius and reasoning in §10.
- **The permissive CORS middleware.** `restapi.EnableCORS` is applied to every route in
  `main.go` and is unchanged by this work (§4). Tightening it to the known web origin is a
  separate change with its own testing, and it is easier to reason about once there is a single
  stable API hostname — which this TRD delivers.
- **Unifying toolchain versions** between `apps/api/Dockerfile` and the workflow, if the
  Docker path stays alive long enough to drift.
- **Migrations stay manual.** The `migrate` binary ships to the box version-matched with the
  running API (decision 6) and is never invoked by anything in this design. Whether the
  pipeline should ever run it is a separate decision with its own failure modes — explicitly
  not this one, and not sketched here.
