#!/usr/bin/env bash
# PHF-083 — Backup diário do Photofy: dump criptografado do Postgres + sync do Storage.
# Roda como cron no ambiente de deploy (Swarm), NÃO no GitHub Actions (não expor prod ao CI).
# Segredos seguem a convenção *_FILE do PHF-081: o valor vem de um arquivo (Swarm secret),
# nunca inline nem em variável de ambiente em texto puro. Nada de credencial no repositório.
set -euo pipefail

# --- Config (via env; segredos via *_FILE apontando para /run/secrets/<nome>) ---
: "${BACKUP_DIR:?defina BACKUP_DIR (destino do dump antes do envio ao armazenamento frio)}"
: "${DATABASE_URL_FILE:?defina DATABASE_URL_FILE (arquivo com a connection string do Postgres)}"
: "${BACKUP_AGE_RECIPIENTS_FILE:?defina BACKUP_AGE_RECIPIENTS_FILE (chave pública age para cifrar)}"
STORAGE_SYNC_CMD="${STORAGE_SYNC_CMD:-}"   # ex.: "rclone sync supabase:media frio:photofy/storage"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

DATABASE_URL="$(cat "$DATABASE_URL_FILE")"
AGE_RECIPIENTS="$(cat "$BACKUP_AGE_RECIPIENTS_FILE")"
STAMP="$(date +%Y-%m-%d)"
DUMP="$BACKUP_DIR/photofy-db-$STAMP.sql.gz.enc"

mkdir -p "$BACKUP_DIR"

echo "[backup] pg_dump -> gzip -> age (cifrado) em $DUMP"
# --no-owner/--no-privileges: o restore recria roles a partir das migrações, não do dump.
pg_dump --no-owner --no-privileges "$DATABASE_URL" \
  | gzip -9 \
  | age --encrypt --recipients-file <(printf '%s\n' "$AGE_RECIPIENTS") \
  > "$DUMP"

# Checksum de integridade — o restore aborta se não bater (ver restore-verify.sh).
sha256sum "$DUMP" > "$DUMP.sha256"
echo "[backup] checksum: $(cat "$DUMP.sha256")"

if [[ -n "$STORAGE_SYNC_CMD" ]]; then
  echo "[backup] sync do Storage (coerência temporal com o dump): $STORAGE_SYNC_CMD"
  bash -c "$STORAGE_SYNC_CMD"
else
  echo "[backup] STORAGE_SYNC_CMD vazio — sync do Storage NÃO executado (configure em produção)"
fi

# Retenção: remove dumps locais mais antigos que RETENTION_DAYS.
# A política mensal-por-12-meses é aplicada no armazenamento frio (lifecycle), não aqui.
echo "[backup] prune de dumps locais > $RETENTION_DAYS dias"
find "$BACKUP_DIR" -name 'photofy-db-*.sql.gz.enc*' -type f -mtime "+$RETENTION_DAYS" -delete

echo "[backup] OK — $DUMP"
