# PRD — Photofy (Sistema de Fotos e Reels ao Vivo para Eventos — Clube Condor)

**Estado:** Draft v0.3 — deriva de ADR-001 e ADR-003 (Google Drive do usuário), pendente de aprovação do PO
**Owner de produto:** Danilo Siqueira — Coordenador de Soluções Digitais
**Tech Lead:** Héctor Velasques / Alejandro — AI Squad
**Codinome interno:** "Photofy" (nome da pasta de projeto; não confirmado como nome comercial final — ver Perguntas abertas)

> Nota de rastreabilidade: este PRD consolida o conteúdo de produto já decidido em dois ADRs encontrados no Drive do usuário — **ADR-001** (versão inicial, inspirada no Fotify/fotify.app) e **ADR-003** ("arquitetura consolidada", que supera um ADR-002 não localizado). O usuário mencionou a existência de um `PRD_Fotos_Eventos_v2.docx` original que não foi encontrado no Drive nem na pasta local conectada (bridge com o Mac indisponível nesta sessão). Tratamos o ADR-003 como fonte de verdade por ser o documento mais recente (13/jul/2026) e por já declarar explicitamente que consolida a v2.0 desse PRD.

## 1. Contexto e problema

O Clube Condor realiza eventos de marca (ativações, inaugurações de loja, promoções) e precisa de uma forma de engajar participantes em tempo real, sem exigir app ou conta, com o conteúdo enviado passando por moderação humana antes de ir ao ar — simultaneamente em um telão físico no local e em uma galeria pública permanente. Hoje essa capacidade não existe internamente; a alternativa seria depender de soluções de terceiros (ex. Fotify) ou de processos manuais por evento. Construir isso internamente reaproveita a infraestrutura já validada em outros produtos do AI Squad (Supabase, Next.js, BullMQ + Redis, Docker Swarm + Traefik — mesmo padrão do Hipermais e do VideoFlow), reduzindo custo de operação e dependência externa.

## 2. Objetivos e métricas de sucesso

| Objetivo | Métrica | Meta inicial (a validar com PO) |
|---|---|---|
| Upload sem fricção para o participante | Tempo entre captura e confirmação de recebimento | < 5s em conexão 4G típica |
| Moderação ágil sem perder o controle humano | Tempo médio de decisão por item na fila | < 15s por item aprovado/reprovado |
| Sustentar picos de evento (ex. momento do brinde) | Reels/fotos processados por minuto sem atraso perceptível no telão | Absorver rajada de ~50 envios/min sem fila > 60s (ver Spike 2) |
| Suportar múltiplos eventos simultâneos | Nº de eventos ativos concorrentes sem degradação cruzada | ≥ 5 eventos simultâneos isolados |
| Conformidade LGPD desde o dia 1 | % de uploads com consentimento versionado registrado | 100% (bloqueante — sem aceite, sem envio) |

As metas numéricas acima são estimativas de trabalho, não compromissos validados — ver seção 8 (Perguntas abertas).

## 3. Personas

| Persona | Quem é | O que precisa do sistema |
|---|---|---|
| **Participante** | Convidado do evento (sem conta, sem app) | Enviar foto/reel em segundos via QR Code, ver que foi recebido, navegar a galeria |
| **Moderador** | Equipe do Condor ou terceirizada, autenticada | Aprovar/reprovar/reverter conteúdo em tempo real, com contexto suficiente (thumbnail, autor, mensagem) |
| **Operador / Telão** | Responsável por operar a tela física no evento | Parear a tela uma vez e deixá-la rodando o slideshow sem manutenção |
| **Organizador (Admin)** | Time do Condor que planeja o evento | Criar o evento, configurar slideshow/termos/limites, acompanhar solicitações de exclusão |
| **Agente de IA (revisor de CI)** | Não é usuário final, mas consome o SPEC/Gherkin como contrato objetivo | Ler `02-spec.md` + cenários Gherkin para validar PRs antes da aprovação humana |

## 4. Alcance

### Dentro de alcance (v1)

- Upload de foto ou reel (até 10s, vertical 9:16) via QR Code, sem login, com autor e mensagem opcionais.
- Aceite único obrigatório cobrindo consentimento de imagem **e** responsabilização por conteúdo impróprio, versionado e registrado (`consent_record`).
- Processamento assíncrono: remoção de EXIF, thumbnail, versão para telão; transcodificação de reel para MP4 H.264 vertical ~10-12MB.
- Fila de moderação humana em tempo real (aprovar/reprovar/reverter, ações em lote, filtros por status).
- Sistema **nunca** comunica ao participante a decisão de moderação (silêncio por design).
- Slideshow configurável (tempo por slide, ordem, transição, exibir autor/mensagem, incluir reels, loop, escurecimento de fundo).
- Pareamento de tela por dispositivo (código temporário, múltiplas telas simultâneas, revogável individualmente).
- Galeria permanente (sem expurgo automático), acessível por link próprio e embutida na tela de upload.
- Exclusão de item específico apenas via `deletion_request` formal, tratada pelo organizador com auditoria.
- Painel do organizador: criação/configuração de evento, geração automática de todos os links (upload, slideshow, monitoramento, galeria) e recursos de pareamento.
- Multi-evento: vários eventos ativos simultaneamente, isolados por `event_id` em todas as tabelas.
- Segurança: bucket privado, URLs assinadas de curto prazo, RBAC, rate limiting na ingestão, secrets manager, auditoria, backups.

### Fora de alcance (v1) — explicitamente adiado

- **Pré-moderação assistida por IA (Gemini Flash)** — estava no ADR-001, mas foi explicitamente removida do escopo v1 no ADR-003 (adiada para v2). Não incluir agora.
- **"Destacar" / prioridade manual no slideshow** — removida do PRD v2; o ordenamento configurável cobre o caso de uso.
- Reconhecimento facial ou marcação automática de pessoas.
- Filtros e edição avançada de imagem no cliente.
- Múltiplos telões sincronizados / layouts de mosaico.
- Integração com redes sociais.
- Multi-tenant real entre contas distintas do Condor (hoje é single tenant — uma única conta Condor, multi-evento).

## 5. Histórias de usuário

- Como **participante**, quero enviar uma foto ou reel de até 10s escaneando um QR Code, sem criar conta, para participar do mural do evento sem fricção.
- Como **participante**, quero ver uma confirmação clara de que meu envio foi recebido, para saber que não preciso reenviar, mesmo sem saber se foi aprovado.
- Como **participante**, quero navegar a galeria permanente do evento a partir da própria tela de envio, para rever o que já foi publicado.
- Como **moderador**, quero ver uma fila em tempo real com thumbnail, autor, mensagem e tipo de mídia, para decidir rapidamente aprovar, reprovar ou reverter.
- Como **moderador**, quero aplicar ações em lote e filtrar por status, para lidar com picos de envio sem gargalo.
- Como **operador de telão**, quero parear minha tela uma única vez com um código temporário, para deixá-la exibindo o slideshow sem intervenção manual durante todo o evento.
- Como **organizador**, quero configurar os parâmetros do slideshow (tempo, ordem, transição, reels) na criação do evento, para adaptar a experiência a cada ativação de marca.
- Como **organizador**, quero receber automaticamente todos os links do evento (upload, slideshow, monitoramento, galeria) ao criá-lo, para não montar isso manualmente a cada ativação.
- Como **organizador**, quero uma fila de solicitações de exclusão (`deletion_request`), para atender pedidos de titulares sem apagar a galeria inteira.
- Como **titular de dados (participante)**, quero poder solicitar a remoção da minha própria imagem mesmo com a galeria sendo permanente por padrão, para exercer meu direito de exclusão sob a LGPD.

## 6. Critérios de aceitação (nível PRD)

- Participante envia foto ou reel de até 10s via QR, com validação de formato/tamanho/duração e aceite obrigatório (privacidade + conteúdo impróprio); sem aceite marcado, o botão de envio permanece desabilitado.
- Reels e fotos grandes são processados de forma assíncrona (fora do request do usuário) e transcodificados sem travar a aplicação.
- Moderador vê itens em lista em tempo real e aprova/reprova/reverte; reprovados ficam armazenados e ocultos, visíveis só para admin/auditoria.
- Sistema não comunica o participante sobre nenhuma decisão de moderação, em nenhum fluxo.
- Somente conteúdo com `status = aprovado` aparece no telão e na galeria permanente.
- Slideshow só inicia após pareamento de tela e respeita os parâmetros configurados pelo organizador.
- Galeria permanente é acessível por link e embutida na tela de envio; exclusão de item específico ocorre apenas via `deletion_request` formal, nunca automaticamente.
- Organizador cria o evento e recebe automaticamente todos os links e recursos de pareamento, sem etapa manual adicional.
- Vários eventos podem estar ativos ao mesmo tempo, cada um isolado por seus próprios dados, filas e links (`event_id` em todas as tabelas relacionadas).

## 7. Riscos conhecidos

Quatro riscos técnicos reais foram identificados, com incerteza genuína (não just-in-case) — ver `01-poc-spikes.md` para os spikes correspondentes:

1. **Pareamento de telas por dispositivo** — o próprio ADR-003 já sinaliza isso como spike necessário antes de codar.
2. **Pipeline de transcodificação de reel sob rajada** — não há dado real de throughput em picos de evento (ex. momento do brinde).
3. **Propagação em tempo real (Supabase Realtime) sob aprovações em lote** — múltiplos assinantes (telão, galeria, painel), múltiplos eventos simultâneos.
4. **Validação de conteúdo contra "image bombs"** e formatos variados de celular (HEIC/HDR/4K) sem gerar falsos positivos.

## 8. Perguntas abertas

- As metas numéricas da seção 2 (tempo de upload, throughput de rajada, latência de Realtime) são estimativas de trabalho — precisam de validação/ajuste com o PO (Danilo Siqueira) e, idealmente, dados de eventos anteriores do Condor.
- Existe um `PRD_Fotos_Eventos_v2.docx` original citado nos ADRs que não foi localizado no Drive nem na pasta local `photofy` (bridge com o Mac do usuário indisponível nesta sessão) — confirmar se esse arquivo tem conteúdo adicional não capturado no ADR-003, ou se o ADR-003 já é a fonte completa.
- O nome "Photofy" é apenas o nome da pasta local do projeto — confirmar se é o nome comercial definitivo do produto ou um codinome interno.
- Texto final dos termos (privacidade + conteúdo impróprio) — pendente de revisão jurídica do Condor (apontado como próximo passo no ADR-003).
- Processo operacional de atendimento a `deletion_request` (SLA, quem executa) — ainda não definido.
- Critério de reativação da pré-moderação por IA (Gemini Flash) e da funcionalidade "Destacar" para v2 — pendente de validação com o PO.
