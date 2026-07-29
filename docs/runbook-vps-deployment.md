# Runbook: `apps/api` VPS Deployment

Operational reference for the VPS that runs `apps/api` in production. Pairs
with [`docs/trd-vps-deployment-automation.md`](./trd-vps-deployment-automation.md),
which explains *why* the system is shaped this way. This document is the
*how*.

> **Status of this runbook**: provisioning (this document, `deploy/vps/provision.sh`)
> lands in Phase 3 of the TRD. The release script (`gatherloop-release`) and
> the rollback script (`gatherloop-rollback`) referenced below are Phase 4
> deliverables. Until Phase 4 ships, "rollback" means the manual symlink
> procedure in [Manual rollback](#manual-rollback), and deploys are a manual
> `scp` + `sudo gatherloop-release` rather than a GitHub Actions run.

---

## 1. Architecture

```
   Internet ──443──> Caddy (auto-TLS) ──> 127.0.0.1:8000 ──> gatherloop-api
                                                               (systemd)
                                                                   │
                                                     existing managed MySQL
```

Filesystem layout on the VPS:

```
/opt/gatherloop-api/
├── releases/
│   ├── 20260728T101500Z-a1b2c3d/     # immutable, one dir per deploy
│   │   ├── api
│   │   ├── migrate
│   │   ├── seed
│   │   └── RELEASE                   # sha, ref, built_at, run_id, go version
│   └── 20260727T183000Z-9f8e7d6/
├── current -> releases/20260728T101500Z-a1b2c3d
└── previous -> releases/20260727T183000Z-9f8e7d6

/etc/gatherloop-api/
└── api.env        0640 root:gatherloop   # the only env file; deploy cannot read it

/usr/local/bin/gatherloop-release         0755 root:root   # Phase 4
/usr/local/bin/gatherloop-rollback        0755 root:root   # Phase 4
/etc/systemd/system/gatherloop-api.service
/etc/sudoers.d/gatherloop-deploy
/etc/caddy/Caddyfile
```

Two Unix users, neither of which can do the other's job:

| User | Role | Can read secrets? | Privileges |
|---|---|---|---|
| `gatherloop` | Runs the API process. System user, `nologin`, owns nothing writable. | Yes — the only user that can read `/etc/gatherloop-api/api.env`. | None. |
| `deploy` | SSH target for CI (and for a human doing a manual deploy). Owns `/opt/gatherloop-api`. | No. | Exactly two `sudo` grants: `gatherloop-release`, `gatherloop-rollback`. |

A compromised `deploy` key gets code execution as an unprivileged user with
no database credentials in reach — see the TRD's Security Considerations for
the full rationale.

---

## 2. First-time provisioning

Prerequisites: a fresh Ubuntu/Debian VPS, root (or root-equivalent sudo)
access over SSH, and this repository checked out on the box (or copied over)
so `deploy/vps/` is available locally.

```bash
# on the VPS, as root
git clone <this repo> /tmp/gatherloop-pos   # or scp the deploy/vps directory over
cd /tmp/gatherloop-pos
sudo ./deploy/vps/provision.sh
```

What it does, in order (see the script for the authoritative list):

1. Creates the `gatherloop` system user/group (`nologin`, no home) — the
   runtime identity for the API process.
2. Creates the `deploy` user (password login locked, SSH-key only) and an
   empty `~/.ssh/authorized_keys` for it if one doesn't exist yet.
3. Creates `/opt/gatherloop-api/{,releases}` owned by `deploy`.
4. Creates `/etc/gatherloop-api` (`0750 root:gatherloop`) and installs
   `api.env` from the template **only if one isn't already there** — it will
   never overwrite a real secrets file on a re-run.
5. Installs and enables (but does not start) the `gatherloop-api.service`
   systemd unit. It stays `inactive` until the first release exists — there
   is nothing at `/opt/gatherloop-api/current/api` yet.
6. Installs `/etc/sudoers.d/gatherloop-deploy`, validating it with
   `visudo -c` before it's put in place.
7. Configures `ufw`: default-deny inbound, allow SSH / 80 / 443.
8. Installs Caddy (official apt repo) and installs `/etc/caddy/Caddyfile`
   from the template **only if one isn't already there**.

The script is idempotent — re-run it any time a file under `deploy/vps/`
changes in the repo. **Never hand-edit a file on the VPS that provision.sh
manages; change the repo and re-run the script instead**, or the VPS drifts
from what's reviewed in source control.

### Required manual steps after the first run

These are deliberately *not* automated — they're one-time, host-specific,
and touch real secrets or DNS:

1. **SSH key**: append CI's public key (the pair for `VPS_SSH_PRIVATE_KEY`)
   to `/home/deploy/.ssh/authorized_keys`.
2. **Secrets**: edit `/etc/gatherloop-api/api.env` and fill in `DB_USERNAME`,
   `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT`, `JWT_SECRET`. Leave
   `BIND_ADDR=127.0.0.1` and `PORT=8000` as shipped — Caddy expects the
   backend on that address.
3. **Domain**: edit `/etc/caddy/Caddyfile`, replacing the placeholder
   hostname with the real API domain, then `sudo systemctl reload caddy`.
   Don't do this until DNS for that host actually points here, or
   certificate issuance will fail and retry.

### Verifying provisioning

```bash
systemctl status gatherloop-api        # loaded, enabled, inactive (dead)
systemd-analyze verify /etc/systemd/system/gatherloop-api.service
sudo -l -U deploy                      # exactly the two NOPASSWD grants
sudo ufw status verbose
systemctl status caddy
```

> Note: `systemd-analyze verify` reports `Command .../current/api is not
> executable: No such file or directory` until the first release is
> deployed — expected, since `current` doesn't exist yet. It stops
> reporting that once the first deploy creates the symlink.

---

## 3. Secret rotation

Secrets live in exactly one place: `/etc/gatherloop-api/api.env`
(`0640 root:gatherloop`). Nothing in CI, in the release tarball, or in the
`deploy` user's reach can read it.

To rotate a secret (e.g. `JWT_SECRET`, a DB password):

```bash
sudo -e /etc/gatherloop-api/api.env   # or: sudoedit
sudo systemctl restart gatherloop-api
curl -s http://127.0.0.1:8000/health-check | jq .
```

Rotating the DB password additionally requires updating it on the managed
MySQL side first (or in lockstep) — the API will fail to connect and the
service will crash-loop (`Restart=on-failure`) until both sides agree.

---

## 4. Logs and observability

The app logs structured JSON to stdout, which systemd sends to journald.

```bash
journalctl -u gatherloop-api -f                    # tail
journalctl -u gatherloop-api -p err --since -1h    # errors in the last hour
systemctl status gatherloop-api                    # unit + recent log lines
cat /opt/gatherloop-api/current/RELEASE            # what is actually running
curl -s http://127.0.0.1:8000/health-check | jq .  # status, version, commit, uptime
```

`/health-check` is the single "what is deployed" oracle — checkable from
anywhere over HTTPS once Caddy is fronting it, no SSH required.

---

## 5. Manual rollback

Once Phase 4 ships, `sudo gatherloop-rollback` does this atomically and
health-gates the result. Until then (or if you need to bypass it), the
underlying procedure is a symlink repoint:

```bash
# on the VPS
cd /opt/gatherloop-api
ls -la releases/                       # confirm the target release exists
sudo -u deploy ln -sfn "$(readlink current)" /tmp/rollback-prev   # note current, for reference
sudo -u deploy ln -sfn "releases/<previous-release-dir>" /tmp/current-new
sudo -u deploy mv -T /tmp/current-new current
sudo systemctl restart gatherloop-api
curl -s http://127.0.0.1:8000/health-check | jq .   # confirm version matches the rolled-back release
```

Swap `previous` to point at the release you just moved away from if you
want a second rollback to be symmetric. Prefer `gatherloop-rollback` once
it exists — it does exactly this, plus the health gate, in one command.

---

## 6. Database migrations (manual, by design)

**Migrations are never run by the deploy pipeline.** The deploy user holds
no database credentials — see the TRD's Decisions #9 and #10. An operator
runs migrations by hand, on the VPS, using the version-matched `migrate`
binary that ships in every release.

### The ordering rule

> **Apply the migration before deploying the code that depends on it.**

Deploying code that expects a column that doesn't exist yet fails the
release's health check and auto-rolls back — a loud, safe failure, but an
avoidable one. For a destructive schema change, invert the order instead:
ship the code that stops using the column *first*, then drop the column in
a later, separate migration (expand → deploy → contract). That ordering
also keeps automatic rollback safe, since rolling the code back one version
never lands it against a schema it can no longer read.

### Applying pending migrations

`cmd/migrate/main.go` always applies **all pending `up` migrations** and
logs the resulting schema version — it takes no arguments and has no
interactive mode. Run it via `systemd-run` as the `gatherloop` user so the
DB credentials come from the same env file the service uses, and are never
typed into a shell or left in shell history:

```bash
# on the VPS, as an operator with sudo
sudo systemd-run --pipe --wait --property=User=gatherloop \
  --property=EnvironmentFile=/etc/gatherloop-api/api.env \
  /opt/gatherloop-api/current/migrate
```

Watch the output — it logs `migrations applied` with the resulting
`version` and `dirty` flag, or panics with the underlying error if a
migration fails partway (in which case `dirty=true`; see below).

### Seeding reference data

Same pattern, same binary contract (`cmd/seed/main.go`), just as deliberate:

```bash
sudo systemd-run --pipe --wait --property=User=gatherloop \
  --property=EnvironmentFile=/etc/gatherloop-api/api.env \
  /opt/gatherloop-api/current/seed
```

### Checking the current schema version

The shipped `migrate` binary only moves forward (`Up()`); it has no
"report version and exit" mode. `golang-migrate` tracks its state in a
`schema_migrations` table, so query it directly with a MySQL client using
the same credentials as `api.env`:

```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" \
  -e "SELECT version, dirty FROM schema_migrations;"
```

(Source the values from `/etc/gatherloop-api/api.env` rather than typing
the password on the command line where a shell might log it — e.g.
`set -a; source /etc/gatherloop-api/api.env; set +a` in a root shell first,
or use a `~/.my.cnf` with restrictive permissions.)

`version` is the sequence number of the last migration file applied
(matching the numeric prefix in `apps/api/migrations/`, e.g. `12` for
`000012_*.up.sql`). `dirty=1` means a previous migration attempt failed
partway through and needs manual intervention before anything else will
run — `golang-migrate` refuses to proceed while dirty.

### Rolling back a migration by hand

There is no automated `down` path shipped to the VPS — reversing a
migration is a deliberate, manual act:

1. Find the corresponding `NNN_<name>.down.sql` file for the version you're
   reversing in `apps/api/migrations/` (in your local checkout — nothing
   needs to be copied to the VPS for this, you're reading it to know what
   SQL to run).
2. Connect to the database and execute that file's SQL by hand:
   ```bash
   mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" \
     < NNN_<name>.down.sql
   ```
3. Update `schema_migrations` to reflect the reversed version:
   ```sql
   UPDATE schema_migrations SET version = <NNN - 1>, dirty = 0;
   ```
4. Re-run the "checking the current schema version" query to confirm.

If a migration failed partway (`dirty=1`) rather than being deliberately
reversed, inspect what the `up.sql` actually changed before touching
`schema_migrations` by hand — the right fix depends on how far the
statement got, and may mean finishing the change manually rather than
reversing it.

---

## 7. Firewall and TLS

`ufw` denies all inbound traffic except SSH, 80, and 443 — port 8000 (the
API's actual listen port) is unreachable from outside the box even if
`BIND_ADDR` were misconfigured. Caddy terminates TLS and proxies to
`127.0.0.1:8000`, obtaining and renewing the Let's Encrypt certificate
automatically. There is no certbot, no renewal cron, and no manual
certificate handling.

```bash
sudo ufw status verbose
sudo systemctl status caddy
sudo journalctl -u caddy -f            # certificate issuance / renewal logs
```

---

## 8. Recording the VPS architecture

- OS/arch: record `uname -m` here once the VPS exists — the CI build's
  `GOARCH` (see the TRD's Detailed Design) must match it. A mismatch
  produces `Exec format error` at restart, which the health gate catches
  and auto-rolls back, but it's better to get right the first time.
- SSH port, hostname/IP: whatever was used for the `VPS_HOST` / `VPS_PORT`
  GitHub Secrets (Phase 5).
- Caddy domain: whatever replaced the placeholder in `/etc/caddy/Caddyfile`.

(Fill these in for the real box once it's provisioned; kept out of this
runbook's checked-in copy since they're host-specific, not repo-specific.)
