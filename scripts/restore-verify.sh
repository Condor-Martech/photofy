#!/usr/bin/env bash
# PHF-083 — Drill de restauração: prova que um backup é restaurável e SEGURO.
# Este é o teste executável da task (02-spec.md §5 não tem Gherkin de backup; §6 não-funcional).
# Restaura SEMPRE num destino de staging/efêmero, NUNCA em produção.
#
# Valida três coisas que um backup precisa garantir:
#   1. Integridade: o checksum bate e o dump restaura sem erro.
#   2. Isolamento: RLS continua habilitado nas tabelas de domínio após o restore.
#   3. LGPD: nenhum media_item com deletion_request executada continua visível (não ressuscita).
set -euo pipefail

: "${BACKUP_FILE:?defina BACKUP_FILE (o dump .sql.gz.enc a restaurar)}"
: "${RESTORE_DB_URL:?defina RESTORE_DB_URL (Postgres de staging/efêmero — NUNCA produção)}"
: "${BACKUP_AGE_IDENTITY_FILE:?defina BACKUP_AGE_IDENTITY_FILE (chave privada age para decifrar)}"

fail() { echo "[drill] FALHA: $*" >&2; exit 1; }

# 1. Integridade — checksum antes de tocar em qualquer coisa.
if [[ -f "$BACKUP_FILE.sha256" ]]; then
  echo "[drill] verificando checksum..."
  sha256sum --check "$BACKUP_FILE.sha256" || fail "checksum não confere — backup corrompido"
else
  echo "[drill] aviso: sem arquivo .sha256, pulando verificação de integridade"
fi

# 2. Restaura: decifra -> gunzip -> psql no destino de staging.
echo "[drill] restaurando em destino de staging..."
age --decrypt --identity "$BACKUP_AGE_IDENTITY_FILE" "$BACKUP_FILE" \
  | gunzip \
  | psql "$RESTORE_DB_URL" -v ON_ERROR_STOP=1 -q \
  || fail "restore não completou"

# 3. RLS ainda habilitado nas tabelas de domínio (isolamento por event_id do §3/PHF-011).
echo "[drill] verificando RLS nas tabelas de domínio..."
UNPROTECTED="$(psql "$RESTORE_DB_URL" -tAc "
  select string_agg(relname, ', ')
  from pg_class
  where relname in ('media_items','moderation_log','consent_record','deletion_request','devices')
    and relrowsecurity = false;
")"
[[ -z "$UNPROTECTED" ]] || fail "RLS desabilitado após restore em: $UNPROTECTED"

# 4. LGPD — nenhum item com exclusão executada pode continuar visível.
# O restore deve re-aplicar o log de exclusões; aqui asseguramos que não sobrou nada.
echo "[drill] verificando que exclusões executadas não ressuscitaram..."
RESURRECTED="$(psql "$RESTORE_DB_URL" -tAc "
  select count(*)
  from media_items m
  join deletion_request d on d.media_id = m.id
  where d.status = 'executada';
")"
[[ "$RESURRECTED" -eq 0 ]] || fail "$RESURRECTED item(ns) com exclusão executada ainda presentes — viola LGPD"

echo "[drill] OK — backup restaurável, RLS ativo, nenhuma exclusão ressuscitada."
