#!/usr/bin/env bash
# One-time setup of UnifiedOS on a fresh Ubuntu 22.04/24.04 droplet.
# Run from the repository checkout, as root:
#     sudo ./deploy/setup-droplet.sh termlink.example.com
# or, to serve plain HTTP on the droplet's IP address (no domain yet):
#     sudo ./deploy/setup-droplet.sh
set -euo pipefail

DOMAIN_ARG="${1:-}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

echo ">> Installing Docker (if needed)"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl git
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# Small droplets (1 GB RAM) run out of memory while building Next.js; add swap.
if [[ ! -f /swapfile ]] && [[ $(awk '/MemTotal/ {print $2}' /proc/meminfo) -lt 3000000 ]]; then
  echo ">> Adding 2 GB swap"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo ">> Configuring firewall (SSH, HTTP, HTTPS)"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw allow 443/udp >/dev/null
  ufw --force enable >/dev/null
fi

if [[ ! -f .env ]]; then
  echo ">> Writing .env with fresh secrets"
  if [[ -n "$DOMAIN_ARG" ]]; then
    DOMAIN="$DOMAIN_ARG"; COOKIE_SECURE=true
  else
    DOMAIN=":80"; COOKIE_SECURE=false
  fi
  umask 077
  cat > .env <<ENV
DOMAIN=$DOMAIN
COOKIE_SECURE=$COOKIE_SECURE
POSTGRES_PASSWORD=$(openssl rand -hex 24)
SESSION_SECRET=$(openssl rand -hex 32)
ENV
else
  echo ">> Keeping existing .env"
fi

echo ">> Building and starting (first build takes a few minutes)"
docker compose up -d --build

echo
echo "UnifiedOS is starting. Check status with:  docker compose ps"
if [[ -n "$DOMAIN_ARG" ]]; then
  echo "Open https://$DOMAIN_ARG  (make sure its DNS A record points at this droplet)."
else
  echo "Open http://$(curl -fsS -4 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
fi
