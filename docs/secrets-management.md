# Gestão de segredos — Photofy (PHF-081)

**Regra dura, inegociável:** nenhuma credencial (chave, token, senha, connection string com senha)
entra no código ou no repositório — nem em texto puro, nem "temporariamente", nem em branch de spike.
Isso vale para variáveis de ambiente, arquivos de config, workflows de CI e documentação.

O gate automatizado `.github/workflows/secret-scan.yml` (gitleaks) barra qualquer PR ou push que
introduza um segredo no diff, na árvore de arquivos ou no **histórico** de commits.

## Onde os segredos vivem (por ambiente)

Mesmo padrão dos demais serviços do AI Squad (Hipermais, VideoFlow): deploy self-hosted em
**Docker Swarm + Traefik**, com segredos servidos pelo secrets manager nativo do Swarm.

| Ambiente | Origem do segredo | Como o app lê |
|---|---|---|
| **Local (dev)** | `.env.local` (a partir de `.env.example`, gitignored) | `process.env.*` via loader do Next.js |
| **CI (GitHub Actions)** | GitHub Actions Secrets (`Settings → Secrets and variables → Actions`) | `${{ secrets.NOME }}` no workflow |
| **Produção (Docker Swarm)** | Docker Swarm secrets, montados em `/run/secrets/<nome>` | lê o arquivo `/run/secrets/<nome>` (convenção `*_FILE`) |

### Produção — Docker Swarm secrets

Segredos são objetos gerenciados pelo Swarm (criptografados em repouso no Raft log e em trânsito),
montados como arquivos somente-leitura em `/run/secrets/<nome>` apenas nos serviços que os declaram —
**nunca** como variável de ambiente em texto puro no `docker service inspect`.

```bash
# Criar/rotacionar um segredo (o valor nunca aparece em history do shell se vier de arquivo/stdin):
printf '%s' "$VALOR" | docker secret create supabase_service_role_key_v1 -
```

```yaml
# Trecho do stack de deploy (o arquivo completo vem com a task de deploy do Swarm):
services:
  web:
    image: ghcr.io/condor-martech/photofy:staging
    secrets:
      - supabase_service_role_key
    environment:
      # Convenção *_FILE: o app lê o caminho do arquivo, não o valor inline.
      SUPABASE_SERVICE_ROLE_KEY_FILE: /run/secrets/supabase_service_role_key
secrets:
  supabase_service_role_key:
    external: true   # criado fora do compose, versionado por sufixo (_v1, _v2) para rotação
```

Rotação = criar `<nome>_v2`, apontar o serviço para ele e remover `<nome>_v1` após o rollout. Swarm
secrets são imutáveis, por isso o versionamento por sufixo.

## Inventário de segredos

`sensível = server-only`; nunca prefixar segredo com `NEXT_PUBLIC_` (isso o expõe ao browser).

| Variável | Sensível? | Origem | Referência |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | não (pública) | Supabase | PHF-010 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | não (pública, protegida por RLS) | Supabase | PHF-010 |
| `SUPABASE_SERVICE_ROLE_KEY` | **sim** | Supabase | PHF-010 |
| `REDIS_URL` | **sim** (se tiver senha) | Redis/BullMQ | PHF-013 |
| `GEMINI_API_KEY` | **sim** | GitHub Actions Secret | pr-review.yml |
| `NEXT_PUBLIC_APP_URL` | não | config | — |

## Contrato de ambiente (base do `.env.example`)

Copie o bloco abaixo para `.env.local` e preencha com valores reais. Em produção estes valores vêm
dos Swarm secrets, não deste arquivo. O scaffold do app (PHF-020) versiona isto como `.env.example`.

```dotenv
# --- Supabase (PHF-010) ---
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-publica>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-server-only>

# --- Redis / BullMQ (PHF-013) ---
REDIS_URL=redis://<host>:6379

# --- App ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Se um segredo vazar (incidente)

1. **Revogar/rotacionar imediatamente** a credencial na origem (Supabase, Redis, GitHub) — assuma
   comprometida no instante em que tocou o repositório, mesmo que o commit tenha sido revertido.
2. Emitir a nova credencial e atualizar o Swarm secret (`_vN+1`) e os Actions Secrets.
3. Reescrever o histórico só se necessário para remover o blob; a rotação é a mitigação real, não o
   `git filter-repo`.
4. Registrar o incidente na auditoria (PHF-082).

## Cobertura de teste (Gherkin)

`02-spec.md §5` não tem cenário Gherkin para gestão de segredos — é um requisito não-funcional
transversal de `§6 Segurança`. A verificação é o **gate automatizado** `secret-scan.yml`: qualquer
PR que introduza uma credencial falha o check antes do merge. Esse é o teste executável desta task.
