#!/usr/bin/env bash
#
# provision.sh — idempotent, re-runnable setup for the gatherloop-api VPS.
#
# Creates the two Unix users, the release directory layout, the systemd
# unit, the sudoers drop-in, the env file template, the firewall rules,
# and Caddy. Safe to run again after editing any file in this directory —
# existing secrets and an already-customised Caddyfile are never
# overwritten. See docs/runbook-vps-deployment.md for first-time setup.
#
# Usage: sudo ./provision.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APP_USER="${APP_USER:-gatherloop}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/gatherloop-api}"
CONFIG_DIR="${CONFIG_DIR:-/etc/gatherloop-api}"
SERVICE_NAME="${SERVICE_NAME:-gatherloop-api}"
SSH_PORT="${SSH_PORT:-22}"

log() {
  printf '[provision] %s\n' "$*"
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "must be run as root (try: sudo $0)" >&2
    exit 1
  fi
}

ensure_app_user() {
  if ! getent group "$APP_USER" >/dev/null; then
    groupadd --system "$APP_USER"
    log "created group $APP_USER"
  fi

  if ! id -u "$APP_USER" >/dev/null 2>&1; then
    useradd --system --gid "$APP_USER" --no-create-home \
      --shell /usr/sbin/nologin --comment "Gatherloop API service user" "$APP_USER"
    log "created user $APP_USER (no-login, no home)"
  else
    log "user $APP_USER already exists, leaving untouched"
  fi
}

ensure_deploy_user() {
  if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir "/home/$DEPLOY_USER" \
      --shell /bin/bash --comment "CI deploy user" "$DEPLOY_USER"
    passwd -l "$DEPLOY_USER" >/dev/null
    log "created user $DEPLOY_USER (password login locked, SSH key only)"
  else
    log "user $DEPLOY_USER already exists, leaving untouched"
  fi

  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0700 "/home/$DEPLOY_USER/.ssh"
  if [[ ! -e "/home/$DEPLOY_USER/.ssh/authorized_keys" ]]; then
    install -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0600 /dev/null \
      "/home/$DEPLOY_USER/.ssh/authorized_keys"
    log "created empty /home/$DEPLOY_USER/.ssh/authorized_keys — add CI's public key"
  fi
}

ensure_filesystem_layout() {
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 "$APP_DIR"
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 0755 "$APP_DIR/releases"
  log "release directory layout ready at $APP_DIR"

  install -d -o root -g "$APP_USER" -m 0750 "$CONFIG_DIR"

  if [[ ! -e "$CONFIG_DIR/api.env" ]]; then
    install -o root -g "$APP_USER" -m 0640 "$SCRIPT_DIR/env/api.env.example" "$CONFIG_DIR/api.env"
    log "installed $CONFIG_DIR/api.env from template — fill in real secrets, then restart the service"
  else
    log "$CONFIG_DIR/api.env already exists, leaving untouched"
  fi
}

install_systemd_unit() {
  install -o root -g root -m 0644 \
    "$SCRIPT_DIR/systemd/gatherloop-api.service" "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
  systemctl enable "${SERVICE_NAME}.service"
  log "installed and enabled ${SERVICE_NAME}.service (inactive until a release is deployed)"
}

install_sudoers() {
  local tmp
  tmp="$(mktemp)"
  install -m 0440 "$SCRIPT_DIR/sudoers/gatherloop-deploy" "$tmp"

  if ! visudo -c -f "$tmp" >/dev/null; then
    echo "generated sudoers file failed validation, aborting" >&2
    rm -f "$tmp"
    exit 1
  fi

  install -o root -g root -m 0440 "$tmp" /etc/sudoers.d/gatherloop-deploy
  rm -f "$tmp"
  log "installed /etc/sudoers.d/gatherloop-deploy"
}

configure_firewall() {
  if ! command -v ufw >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y ufw
    log "installed ufw"
  fi

  ufw default deny incoming
  ufw default allow outgoing
  ufw allow "${SSH_PORT}/tcp"
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  log "ufw active: deny inbound except ${SSH_PORT}/tcp, 80/tcp, 443/tcp"
}

install_caddy() {
  if ! command -v caddy >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl gnupg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
      | gpg --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
      -o /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y
    apt-get install -y caddy
    log "installed caddy"
  else
    log "caddy already installed"
  fi

  if [[ ! -e /etc/caddy/Caddyfile ]]; then
    install -o root -g root -m 0644 "$SCRIPT_DIR/caddy/Caddyfile.example" /etc/caddy/Caddyfile
    log "installed /etc/caddy/Caddyfile from template — replace the placeholder hostname before pointing DNS at this host"
  else
    log "/etc/caddy/Caddyfile already exists, leaving untouched"
  fi

  systemctl enable caddy
  systemctl restart caddy
  log "caddy enabled and (re)started"
}

main() {
  require_root
  ensure_app_user
  ensure_deploy_user
  ensure_filesystem_layout
  install_systemd_unit
  install_sudoers
  configure_firewall
  install_caddy
  log "provisioning complete"
}

main "$@"
