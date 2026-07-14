# Backups e plano de recuperação — Photofy (PHF-083)

Objetivo: garantir que os dados do Photofy sobrevivam a uma falha (corrupção, exclusão acidental,
perda do provedor) e que exista um procedimento **testado** para restaurá-los dentro de um tempo
aceitável. Um backup que nunca foi restaurado não é um backup — é uma esperança. Por isso este plano
inclui um *drill* de restauração executável (`scripts/restore-verify.sh`), que é o teste real da task.

## O que backup protege (e o que não é backup)

| Camada | É backup? | Coberto por |
|---|---|---|
| Postgres (dados de domínio + auditoria) | **sim** | `pg_dump` diário + PITR do Supabase |
| Supabase Storage (bucket privado de mídia) | **sim** | sync do bucket para armazenamento frio |
| Schema / migrações (`supabase/migrations/*`) | já versionado no git | não precisa de dump |
| Segredos (Swarm secrets, Actions Secrets) | **não** vão para backup | PHF-081 (rotação é a recuperação, não restore) |
| Imagens Docker | reconstruíveis a partir do git | GHCR (`docker-publish.yml`, PHF-094) |

Replicação/alta disponibilidade (§6 Disponibilidade) **não** é backup: um `delete` ou uma migração
errada replicam na mesma velocidade. Backup é a única defesa contra erro lógico e contra perda do
provedor. Os dois coexistem.

## Escopo dos dados (o que precisa estar no dump)

Todas as tabelas de `02-spec.md §3` — com atenção especial às de **auditoria e PII**, que não podem
ser perdidas nem vazadas:

| Tabela | Sensibilidade | Por que é crítica no backup |
|---|---|---|
| `events`, `slideshow_config` | baixa | configuração; reconstruível mas trabalhosa |
| `media_items` | média | ponteiros para a mídia; sem eles o Storage é órfão |
| `moderation_log` | **auditoria** | prova de quem decidiu o quê — nunca pode ser perdida |
| `consent_record` | **PII / LGPD** | prova de consentimento (`ip_hash`, `user_agent`, `versao_termos`) |
| `deletion_request` | **auditoria / LGPD** | registro do direito de exclusão exercido |
| `devices` | baixa | pareamento; regenerável |

O Storage guarda `url_original`, `url_processada`, `url_thumb`. O backup do Storage e o do banco
precisam ser **coerentes no tempo** (mesma janela): um `media_items` restaurado apontando para um
objeto de Storage que não foi restaurado gera item quebrado na galeria permanente.

## Cadência e retenção

Deploy é self-hosted (Docker Swarm + Traefik) com Supabase gerenciado (`*.supabase.co`, ver PHF-081).
Usamos **duas linhas de defesa independentes** para não ter ponto único de falha no próprio backup:

1. **PITR do Supabase (gerenciado)** — Point-in-Time Recovery no plano Pro. RPO de minutos dentro da
   janela de retenção do plano. É a recuperação rápida para incidentes recentes.
2. **Dump próprio, fora do provedor** — `scripts/backup.sh` roda como cron no ambiente de deploy e
   escreve um `pg_dump` comprimido + **criptografado** e um sync do bucket para armazenamento frio
   (S3-compatível / disco offsite). Protege contra perda da conta Supabase, não só contra erro lógico.

| Item | Frequência | Retenção | Onde |
|---|---|---|---|
| PITR (Supabase) | contínuo (WAL) | conforme plano (ex. 7 dias) | Supabase |
| Dump full do banco | **diário** (cron 03:00 America/Sao_Paulo) | 30 dias rolantes + 1 mensal por 12 meses | armazenamento frio offsite |
| Sync do Storage | **diário**, incremental | mesma política do dump | armazenamento frio offsite |
| Drill de restauração | **mensal** | relatório em PHF-082 (auditoria) | CI/ambiente de staging |

Retenção maior (mensal por 12 meses) porque a **galeria é permanente** (regra dura do CLAUDE.md):
não há expurgo por tempo, então o horizonte de recuperação também é longo.

## LGPD: restauração NÃO pode ressuscitar dados excluídos

Ponto crítico de PII e o mais fácil de errar. Quando um titular exerce o direito de exclusão, o
organizador executa uma `deletion_request` (PHF-062/063) e o `media_items` some da galeria e do
Storage. Se meses depois restaurarmos um backup **anterior** a essa exclusão, o item excluído
reaparece — violação direta da LGPD.

Ponto sutil: um dump é congelado no tempo. As exclusões que aconteceram **depois** dele não estão
nele. Por isso a reconciliação usa o **ledger de exclusões mais recente disponível** (a tabela
`deletion_request` viva, se sobreviveu; senão a do backup mais novo), não apenas a do dump restaurado.
`deletion_request` executada é **append-only** (nunca reaproveitada/apagada) exatamente para servir de
ledger autoritativo ao longo do tempo. O procedimento de restore:

1. Restaura banco + Storage do backup escolhido.
2. Reconcilia contra o ledger de exclusões **mais recente** (não só o do dump): coleta todo
   `deletion_request` com `status = 'executada'`.
3. Re-executa a exclusão de cada `media_id` correspondente (banco + objetos de Storage).
4. Só então reabre o tráfego público (galeria/telão).

`scripts/restore-verify.sh` valida a invariante automatizável: dentro do estado restaurado, nenhum
`media_item` pode coexistir com uma `deletion_request` executada apontando para ele. Se algum
coexistir, o drill falha. A reconciliação cross-time do passo 2 (aplicar exclusões posteriores ao
dump) é uma etapa manual auditada do runbook — risco alto, 2 aprovações.

## Alvos de recuperação (RTO / RPO)

| Cenário | RPO (perda máxima) | RTO (tempo até voltar) |
|---|---|---|
| Erro lógico recente (durante evento) | minutos (PITR) | < 30 min via PITR |
| Perda do provedor Supabase | ≤ 24 h (último dump diário) | < 4 h (restore do dump em novo projeto) |
| Corrupção detectada tarde | até 12 meses (dump mensal) | < 8 h |

Durante a **janela de um evento ao vivo**, a criticidade é máxima: priorizar PITR (RTO curto) e
comunicar ao organizador. Fora de evento, o dump offsite é aceitável.

## Runbook de restauração

Pré-requisitos: acesso ao armazenamento frio, à chave de descriptografia (Swarm secret, convenção
`*_FILE` do PHF-081) e a um destino Postgres/Storage limpo.

```bash
# 1. Escolher o backup (ponto no tempo desejado) e descriptografar+restaurar o banco.
#    Restaure SEMPRE primeiro num destino de staging, nunca direto em produção.
BACKUP_FILE=frio/photofy-db-2026-07-14.sql.gz.enc \
  RESTORE_DB_URL="postgresql://...staging..." \
  ./scripts/restore-verify.sh

# 2. Sincronizar o Storage do mesmo dia (coerência temporal com o dump).
# 3. Re-aplicar exclusões executadas (o restore-verify já valida; aplicar em prod é manual e auditado).
# 4. Rodar smoke test (RLS ativo? galeria só mostra aprovados? itens excluídos ausentes?).
# 5. Promover staging validado para produção e reabrir o tráfego público.
```

Nunca restaure direto em produção sem passar pelo drill em staging: uma restauração é uma operação
de **risco alto** (mexe em `consent_record`/`deletion_request`) e segue o gate de 2 aprovações
humanas + QA manual do CLAUDE.md.

## Segurança do backup

- **Criptografia em repouso**: o dump é cifrado com `age`/`gpg` (chave via Swarm secret, nunca no
  repo — PHF-081) antes de sair do ambiente. Um dump em claro é um vazamento de todo o `consent_record`.
- **Acesso mínimo**: só o serviço de backup e o operador de recuperação leem o armazenamento frio.
- **TLS em trânsito** ao enviar para o armazenamento frio (§6 Segurança).
- **Verificação de integridade**: cada backup registra um checksum; o restore aborta se não bater.

## Cobertura de teste (Gherkin)

`02-spec.md §5` não tem cenário Gherkin para backup — é requisito não-funcional transversal
(§6 Disponibilidade / Observabilidade). O teste executável desta task é o **drill de restauração**
`scripts/restore-verify.sh`: prova que um dump é restaurável, que o RLS continua ativo após restore e
que itens com exclusão executada **não** ressuscitam. O drill mensal roda em staging e seu resultado é
registrado na auditoria (PHF-082). Um backup só conta como válido depois de um drill verde.
