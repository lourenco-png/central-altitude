#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Central Altitude — Script de Backup do Banco de Dados
#
# Uso:
#   chmod +x scripts/backup.sh
#   DATABASE_URL="postgresql://..." ./scripts/backup.sh
#
# Para agendar (crontab -e):
#   0 2 * * * DATABASE_URL="..." /caminho/scripts/backup.sh >> /var/log/ca-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERRO] Variável DATABASE_URL não definida."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DATE=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/central_altitude_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +%FT%TZ)] Iniciando backup..."
pg_dump "$DATABASE_URL" | gzip > "$FILE"
echo "[$(date -u +%FT%TZ)] Backup salvo em: $FILE ($(du -sh "$FILE" | cut -f1))"

# Remover backups com mais de 30 dias
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "[$(date -u +%FT%TZ)] Backups antigos (>30 dias) removidos."
