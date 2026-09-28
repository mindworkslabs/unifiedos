#!/usr/bin/env bash
# Dump the database to ./backups/unifiedos-YYYYmmdd-HHMMSS.sql.gz and keep the last 14.
# Schedule nightly with:  sudo crontab -e  →  0 3 * * * /opt/unifiedos/deploy/backup.sh
# Restore:  gunzip -c backups/FILE.sql.gz | docker compose exec -T db psql -U unifiedos unifiedos
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
file="backups/unifiedos-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T db pg_dump -U unifiedos --clean --if-exists unifiedos | gzip > "$file"
ls -1t backups/unifiedos-*.sql.gz | tail -n +15 | xargs -r rm --
echo "Backup written: $file"
