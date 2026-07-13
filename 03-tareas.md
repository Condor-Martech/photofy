# Desglose de tarefas — prontas para Multica

Prefixo de IDs: **PHF** (Photofy)

Todas as tarefas abaixo arrancam em estado **Spec Ready** no board `Backlog → Spec Ready → To Do → In Progress → In Review (PR) → QA → Done`, pois já têm o SPEC de `02-spec.md` anexado.

## Epic 0 — Spikes de risco técnico (bloqueiam as epics de execução correspondentes)
- **PHF-001** — Spike: pareamento de tela por dispositivo (Device Authorization Flow). Risco: alto. Timebox: 2 dias.
- **PHF-002** — Spike: pipeline de transcodificação de reel sob rajada. Risco: alto. Timebox: 3 dias.
- **PHF-003** — Spike: propagação Realtime sob aprovação em lote. Risco: médio. Timebox: 2 dias.
- **PHF-004** — Spike: validação de conteúdo contra image bombs / formatos de celular. Risco: médio. Timebox: 2 dias.

## Epic 1 — Modelo de dados e infraestrutura base
- **PHF-010** — Provisionar projeto Supabase (DB, Storage, Auth, Realtime) e schema inicial (events, media_items, moderation_log, consent_record, deletion_request, devices, slideshow_config). Risco: médio.
- **PHF-011** — Configurar RLS por event_id em todas as tabelas de domínio. Risco: alto (segurança/isolamento entre eventos).
- **PHF-012** — Configurar bucket privado do Storage + política de URLs pré-assinadas de curto prazo. Risco: alto.
- **PHF-013** — Subir worker BullMQ + Redis (esqueleto de filas, sem lógica de negócio ainda). Risco: baixo.

## Epic 2 — Upload e consentimento do participante
- **PHF-020** — Rota pública Next.js `/evento/[slug]` com formulário de upload (autor, mensagem, aceite duplo). Risco: médio.
- **PHF-021** — Endpoint de geração de URL pré-assinada + confirmação de upload. Risco: médio.
- **PHF-022** — Validação client-side de tipo MIME, tamanho e duração antes do envio. Risco: baixo.
- **PHF-023** — Registro de consent_record (aceite_termos, aceite_conteudo, ip_hash, versao_termos). Risco: alto (LGPD).
- Depende de: PHF-010, PHF-012.

## Epic 3 — Processamento assíncrono de mídia
- **PHF-030** — Worker de imagem: auto-orientação, remoção de EXIF, resize, thumbnail + versão telão, pixel budget. Risco: médio.
- **PHF-031** — Worker de reel: validação de duração, transcodificação MP4 H.264 vertical ~1080p. Risco: alto (depende do resultado de PHF-002).
- **PHF-032** — Validação server-side real (magic bytes, sniff de container/codec) e scan antivírus antes de enfileirar. Risco: alto (depende do resultado de PHF-004).
- **PHF-033** — Tratamento de erro/retry com backoff; status "erro" isolado, sem aviso ao participante. Risco: médio.
- Depende de: PHF-001 (para escopo geral do fluxo), PHF-002, PHF-004, PHF-013.

## Epic 4 — Moderação ao vivo
- **PHF-040** — Painel de moderação: lista em tempo real com thumbnail/autor/mensagem/status, badge de pendentes. Risco: médio.
- **PHF-041** — Ações de moderação: aprovar/reprovar/reverter, com registro em moderation_log. Risco: médio.
- **PHF-042** — Ações em lote e filtros por status. Risco: baixo.
- **PHF-043** — Preview ampliado (foto tela cheia, player de reel). Risco: baixo.
- Depende de: PHF-030, PHF-031.

## Epic 5 — Slideshow no telão e pareamento de dispositivo
- **PHF-050** — Implementar Device Authorization Flow de produção com base no achado de PHF-001. Risco: alto.
- **PHF-051** — Tela de slideshow: estado vazio com background, rotação de aprovados via Realtime, sem reload. Risco: médio.
- **PHF-052** — Parâmetros configuráveis do slideshow (tempo, ordem, transição, overlay, reels, loop, escurecimento). Risco: baixo.
- **PHF-053** — Revogação individual de dispositivo pareado. Risco: médio.
- Depende de: PHF-001, PHF-041.

## Epic 6 — Galeria permanente e exclusão sob solicitação
- **PHF-060** — Galeria pública paginada `/evento/[slug]/galeria`, apenas itens aprovados. Risco: baixo.
- **PHF-061** — Bloco "Álbum ao vivo" embutido na tela de upload. Risco: baixo.
- **PHF-062** — Fluxo de deletion_request (criação pelo titular, fila para o organizador). Risco: alto (direito de exclusão LGPD).
- **PHF-063** — Execução da exclusão pelo organizador com registro de auditoria. Risco: alto.
- Depende de: PHF-041.

## Epic 7 — Painel do organizador
- **PHF-070** — `/admin/eventos` — listagem com status e contagem de itens. Risco: baixo.
- **PHF-071** — `/admin/eventos/novo` — criação de evento com geração automática de todos os links e recursos de pareamento. Risco: médio.
- **PHF-072** — `/admin/eventos/[slug]/moderacao` — acesso à fila de moderação daquele evento. Risco: baixo.
- **PHF-073** — `/admin/eventos/[slug]/solicitacoes` — fila de deletion_request pendentes. Risco: médio.
- Depende de: PHF-010, PHF-041, PHF-062.

## Epic 8 — Segurança, LGPD e observabilidade
- **PHF-080** — Rate limiting e proteção anti-abuso na ingestão. Risco: alto.
- **PHF-081** — Secrets manager (nenhuma credencial em código/repositório). Risco: alto.
- **PHF-082** — Logs de acesso/auditoria e alertas de anomalia. Risco: médio.
- **PHF-083** — Backups regulares e plano de recuperação. Risco: médio.
- Depende de: PHF-010.

## Epic 9 — CI/CD e repositório
- **PHF-090** — Configurar repositório GitHub: branches `staging`/`main` protegidas, PR template com checklist Gherkin + disclosure de IA. Risco: médio.
- **PHF-091** — CI: lint, testes unitários, build. Risco: baixo.
- **PHF-092** — Agente revisor headless via Gemini CLI (`google-github-actions/run-gemini-cli@v0`, `GEMINI_CLI_TRUST_WORKSPACE=true`) lendo SPEC + Gherkin + diff do PR. Risco: médio.
- **PHF-093** — Workflow de promoção staging → main com aprovação manual. Risco: alto.
- Não depende de outras epics — pode (e deve) rodar em paralelo, antes de qualquer PR de código de produto ser aberto.

## Resumo de dependências críticas

```
Epic 0 (spikes) ──┬──> Epic 3 (processamento) ──> Epic 4 (moderação) ──┬──> Epic 5 (slideshow/telão)
                   │                                                    ├──> Epic 6 (galeria/exclusão) ──> Epic 7 (painel organizador)
                   └──> Epic 5 (pareamento, PHF-001)                    │
Epic 1 (dados/infra) ──> Epic 2 (upload/consentimento) ──> Epic 3       │
Epic 9 (CI/CD) — paralelo, mas deve estar pronto ANTES do primeiro PR de código real ser aberto (nenhum agente commita sem branch protegida + PR template + revisor Gemini configurados)
```
