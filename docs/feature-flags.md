# Feature Flags — Photofy

Photofy nao usa um sistema de feature flags runtime (LaunchDarkly, Unleash, tabela `feature_flags` em DB). Em vez disso, mudancas de risco alto que precisam de kill-switch adotam o padrao **migracao reversivel**: a migracao "up" liga o comportamento, um snippet SQL "down" documentado nesta pagina desliga sem destruir dados.

## Por que "migracao reversivel" em vez de flag runtime?

- **Mudancas de RLS nao sao flag runtime por natureza.** Quando uma policy esta ativa, ela e a fonte de verdade para o Postgres decidir quem le o que. Nao ha branch "if flag on" — a policy existe ou nao existe.
- **Menos superficie de erro.** Um flag runtime esquecido em `off` em producao e outro em `on` em staging causa o proprio tipo de bug que a spec queria evitar. O snippet SQL de rollback e explicito, versionado e revisavel.
- **Auditavel.** Aplicar/reverter o rollback e um evento distinto no historico de operacao (log de `psql` ou Studio) — mais facil de reconstruir do que trocar um bit em UI de terceiros.
- **Governanca alinhada com o repo.** Toda mudanca de risco alto (RLS, `consent_record`, `deletion_request`, DAF) ja exige 2 aprovacoes humanas per `CLAUDE.md`. O snippet de rollback e revisado no mesmo PR — nao vira surpresa no meio de um incidente.

Trade-off: reverter exige acesso ao banco (via `psql` ou Supabase Studio como `service_role`). Isso e proposital — a governanca de risco alto ja exige aprovacao humana antes de tocar producao.

---

## PHF-011 — RLS + `public.is_staff()`

### Estado LIGADO

Migracao `supabase/migrations/20260713130000_phf011_rls_is_staff.sql` aplicada. Efeitos:

- Tabela `public.profiles` existe (deny-all RLS).
- Funcao `public.is_staff()` retorna `TRUE` para `profiles.role IN ('admin','moderador')`.
- Policies de SELECT ativas em `events`, `slideshow_config`, `media_items`, `moderation_log`, `consent_record`, `deletion_request`, `devices`.
- Escrita cliente continua deny-all (INSERT/UPDATE/DELETE so via `service_role`).

### Estado DESLIGADO (rollback)

Aplicar o snippet SQL abaixo via `psql` ou Studio como `service_role`. **NAO existe migracao de rollback real** — este e o "flag off" documentado.

```sql
-- phf011_down.sql — Rollback de PHF-011.
-- Aplicar via psql/Studio como service_role.
--
-- ATENCAO — o que este script NAO faz (proposital):
--   * NAO dropa public.is_staff()  -> phf082 (audit_log) e phf063 dependem.
--   * NAO dropa public.profiles    -> preserva staff cadastrado; is_staff() continua
--                                     retornando FALSE (nenhum row satisfaz o EXISTS
--                                     apos as policies serem removidas).
--   * NAO desabilita RLS das tabelas de dominio -> ficam deny-all, situacao SEGURA
--                                     (pre-PHF-011). Rota publica /evento/[slug]
--                                     para de funcionar ate reaplicar a migracao —
--                                     e o comportamento esperado do "kill switch".

-- devices
drop policy if exists "devices: staff le tudo" on public.devices;
drop policy if exists "devices: proprio device le a si mesmo" on public.devices;

-- deletion_request
drop policy if exists "deletion_request: staff le tudo" on public.deletion_request;

-- consent_record
drop policy if exists "consent_record: staff le tudo" on public.consent_record;

-- moderation_log
drop policy if exists "moderation_log: staff le tudo" on public.moderation_log;

-- media_items
drop policy if exists "media_items: staff le tudo" on public.media_items;
drop policy if exists "media_items: device le proprio evento" on public.media_items;
drop policy if exists "media_items: anon le aprovado de evento ativo" on public.media_items;

-- slideshow_config (mantem RLS habilitada = deny-all pos-drop)
drop policy if exists "slideshow_config: staff le tudo" on public.slideshow_config;
drop policy if exists "slideshow_config: device le proprio evento" on public.slideshow_config;

-- events (mantem RLS habilitada = deny-all pos-drop)
drop policy if exists "events: staff le tudo" on public.events;
drop policy if exists "events: device le proprio evento" on public.events;
drop policy if exists "events: anon le ativos" on public.events;

-- NAO dropar: public.is_staff() (phf082 policy depende)
-- NAO dropar: public.profiles (rollback nao destroi dados de staff cadastrados)
-- NAO desabilitar RLS: manter deny-all e mais seguro que abrir tabelas
```

**Efeito**: as tabelas de dominio voltam ao estado deny-all para clientes (situacao pre-PHF-011). A funcao `is_staff()` persiste retornando `FALSE` para todos (o `EXISTS` interno continua funcionando; se `profiles` ficou vazia por alguma razao, retorna FALSE — nao gera erro). A policy de `audit_log` (PHF-082) continua funcional — staff que estiver cadastrado ainda le a trilha; nao-staff recebe 0 rows sem erro.

**Rollback do rename de `phf082`** (caso o timestamp precise voltar): `git revert` do PR de PHF-011.

### Quando reverter (gatilhos)

Aplicar `phf011_down.sql` em resposta a qualquer um destes:

1. **Data leak cross-evento detectado** — bug de policy permitiu que device pareado a evento A leia dados de evento B (violacao dura da regra de isolamento).
2. **Quebra de silencio de moderacao em staging/producao** — participante anon consegue ver rows com `status IN ('pendente','reprovado','erro')` em `media_items` (violacao dura da regra inegociavel do `CLAUDE.md`).
3. **Falha critica de performance em galeria publica** — policy `media_items: anon le aprovado de evento ativo` degrada latencia p95 alem do SLO (subquery a `events` nao usando index esperado), ao ponto de derrubar a rota `/evento/[slug]`.

Para incidentes 1 e 2, reverter e a acao imediata; investigacao/fix segue depois com re-aplicacao da migracao corrigida em novo PR. Para incidente 3, avaliar tuning (index em `events(status)` se ainda nao existir) antes de reverter.

### Governanca de reversao em producao

Alinhada com `CLAUDE.md` §"Governanca de IA por risco" (PHF-011 e risco ALTO):

- **2 aprovacoes obrigatorias**: 1 tech (senior backend/DB, autorizado a rodar `psql` como `service_role` em prod) + 1 produto/seguranca (valida o gatilho — data leak/silencio quebrado justificam a reversao).
- **Comunicacao**: registrar em canal `#photofy-incidents` (ou equivalente) antes de aplicar, com link para o incidente que motiva a reversao e para este documento.
- **Auditoria**: o comando `psql` executado gera log no servidor de banco; anexar ao post-mortem do incidente.
- **Re-aplicacao**: novo PR (novo timestamp de migracao ou re-executar a original apos fix), passando pelo mesmo gate de 2 aprovacoes humanas + QA staging.

### Nota importante

**PHF-011 nao tem toggle runtime.** Nao ha coluna em `feature_flags`, nem env var, nem `if (flags.phf011)`. O "flag on" e a migracao aplicada; o "flag off" e o snippet acima aplicado. Qualquer futura mudanca em PHF-011 (ex.: policy nova, ajuste de matriz) exige migracao propria com seu proprio rollback documentado — nao se acumula neste snippet.
