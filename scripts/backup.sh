#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Central Altitude — Script de Backup do Banco de Dados
#
# Uso local:
#   chmod +x scripts/backup.sh
#   DATABASE_URL="postgresql://..." ./scripts/backup.sh
#
# Com upload automático para R2 (Cloudflare):
#   DATABASE_URL="..." R2_ACCOUNT_ID="..." R2_ACCESS_KEY_ID="..." \
#   R2_SECRET_ACCESS_KEY="..." R2_BUCKET_NAME="central-altitude" \
#   ./scripts/backup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERRO] Variável DATABASE_URL não definida."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="central_altitude_${DATE}.sql.gz"
FILE="$BACKUP_DIR/$FILENAME"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +%FT%TZ)] Iniciando backup do banco..."
pg_dump "$DATABASE_URL" | gzip > "$FILE"
echo "[$(date -u +%FT%TZ)] Backup gerado: $FILE ($(du -sh "$FILE" | cut -f1))"

# ── Upload para Cloudflare R2 (opcional — requer variáveis R2_*) ──────────────
if [ -n "${R2_ACCOUNT_ID:-}" ] && [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_SECRET_ACCESS_KEY:-}" ]; then
  BUCKET="${R2_BUCKET_NAME:-central-altitude}"
  R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
  R2_KEY="backups/${FILENAME}"

  echo "[$(date -u +%FT%TZ)] Enviando para R2: s3://${BUCKET}/${R2_KEY} ..."

  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  aws s3 cp "$FILE" "s3://${BUCKET}/${R2_KEY}" \
    --endpoint-url "$R2_ENDPOINT" \
    --no-progress

  echo "[$(date -u +%FT%TZ)] Upload concluído."

  # Remover backups com mais de 30 dias no R2
  CUTOFF=$(date -u -d "30 days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
    || date -u -v-30d +%Y-%m-%dT%H:%M:%SZ)  # compatível com macOS

  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  aws s3 ls "s3://${BUCKET}/backups/" \
    --endpoint-url "$R2_ENDPOINT" \
  | awk '{print $4}' \
  | while read -r KEY; do
      FILE_DATE=$(echo "$KEY" | grep -oP '\d{8}_\d{6}' || true)
      if [ -n "$FILE_DATE" ]; then
        FILE_TS=$(date -d "${FILE_DATE:0:8} ${FILE_DATE:9:2}:${FILE_DATE:11:2}:${FILE_DATE:13:2}" +%s 2>/dev/null \
          || date -j -f "%Y%m%d %H%M%S" "${FILE_DATE:0:8} ${FILE_DATE:9:6}" +%s 2>/dev/null || echo 0)
        CUTOFF_TS=$(date -d "$CUTOFF" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$CUTOFF" +%s 2>/dev/null || echo 0)
        if [ "$FILE_TS" -lt "$CUTOFF_TS" ] 2>/dev/null; then
          echo "[$(date -u +%FT%TZ)] Removendo backup antigo: backups/$KEY"
          AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
          AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
          aws s3 rm "s3://${BUCKET}/backups/$KEY" \
            --endpoint-url "$R2_ENDPOINT"
        fi
      fi
    done
else
  echo "[AVISO] Variáveis R2_* não definidas — backup salvo apenas localmente em $FILE"
fi

echo "[$(date -u +%FT%TZ)] Backup concluído."
