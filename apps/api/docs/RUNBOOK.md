# `apps/api` runbook — day-2 operations

This is the day-2 reference for the VPS deployment: how to redeploy by hand, how to read logs,
and how uptime monitoring is set up. For how the automated pipeline works and how the box was
provisioned, see [`DEPLOY_NATIVE.md`](./DEPLOY_NATIVE.md); for the Docker alternative, see
[`DEPLOY.md`](./DEPLOY.md).

**No migration procedure is here on purpose.** Running database migrations is out of scope for
this pipeline — schema changes are applied by hand by the operator, outside of any of these
documents. The `migrate` binary is shipped to the box version-matched with `api` (it rides along
in the same `api-deploy.tar.gz`) but nothing here ever invokes it.

## Manual redeploy

The pipeline runs automatically on every push to `main` that touches `apps/api/**`,
`libs/api-contract/**`, `go.work`, `package-lock.json`, or the workflow file itself. To redeploy
by hand — most commonly to recover from a bad deploy by re-running a known-good commit (decision
8 in the TRD), or to re-apply the current `main` without a new commit:

1. Go to the repository's **Actions** tab.
2. Select **Deploy api to VPS** in the left-hand workflow list.
3. Click **Run workflow**.
4. Pick the branch or leave it at the default (`main`) and confirm.

This runs both jobs — `build` then `deploy` — exactly as a normal push would. There is no
separate "redeploy only" trigger and no retained release history to roll back to; the recovery
mechanism *is* re-running the workflow at whichever commit is known good. A deploy is cheap
enough (compile + `scp` + `git reset --hard` + `systemctl restart`) that this is faster to do
than to build tooling around.

If the run goes red, the `deploy` job's health-check gate has already printed the last 100 lines
of `journalctl` into the job log — start there before SSHing in.

## Log tailing

The API writes structured JSON to stdout; systemd captures it and journald stores it. From the
VPS:

```bash
journalctl -u gatherloop-pos-api -f            # tail, live
journalctl -u gatherloop-pos-api -n 100        # last 100 lines
journalctl -u gatherloop-pos-api --since "1 hour ago"
systemctl status gatherloop-pos-api            # state, PID, uptime, last exit
```

Every line is JSON with `service` and `env` fields attached (`logger.New` in
`apps/api/pkg/logger/logger.go`), so it pipes cleanly into `jq` for filtering, e.g.
`journalctl -u gatherloop-pos-api -f -o cat | jq 'select(.level=="error")'`.

## Uptime monitoring

The target is the existing health endpoint, unchanged by this deploy: `GET /health-check` over
the public hostname (through the reverse proxy — see
[`DEPLOY.md`](./DEPLOY.md#reverse-proxy-and-tls)), returning `200` with body
`health check success`.

**Recommended: an external HTTP monitor** (e.g. UptimeRobot, Better Uptime, Pingdom, or
whatever the operator already uses for other services) polling
`https://<api-host>/health-check` every 1–5 minutes, alerting on non-200 or timeout. External is
preferred because it also proves the reverse proxy, TLS, and DNS are working end to end, not
just that the process is alive.

**Self-hosted alternative**, if a third-party monitor is not wanted: a cron job on a *different*
machine than the VPS being monitored (monitoring a box from itself cannot detect the box being
down), for example:

```bash
# crontab -e, on a separate host
* * * * * curl -fsS --max-time 5 https://<api-host>/health-check > /dev/null || \
  echo "gatherloop-pos-api health check failed at $(date -u)" | mail -s "API down" ops@example.com
```

Swap the `mail` line for whatever notification channel is actually watched (Slack webhook,
Telegram bot, SMS gateway — anything that reaches a human).

**Whichever option is used, prove the alert path fires once before calling monitoring live.**
Deliberately break the check — stop the service (`sudo systemctl stop gatherloop-pos-api`),
block the port, or point the monitor at a wrong path — and confirm the notification actually
arrives, then restore the service and re-verify the health check passes. A monitor that has never
been seen to fire is not a monitor, it's a false sense of safety.

## What's deliberately not here

- **Database migrations.** See the note at the top of this document and TRD §4 (non-goals).
- **Rollback beyond re-running the workflow.** There is no staged release history to swap back
  to; see decision 8 in the TRD.
- **Provisioning a new VPS from scratch.** That is the one-time setup in
  [`DEPLOY_NATIVE.md`](./DEPLOY_NATIVE.md#one-time-setup).
