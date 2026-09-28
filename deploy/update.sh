#!/usr/bin/env bash
# Pull the latest code and redeploy. Migrations run automatically when the app starts.
#     sudo ./deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
docker compose up -d --build
docker image prune -f >/dev/null
docker compose ps
