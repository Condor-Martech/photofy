# Photofy Worker (PHF-013)

Esqueleto do worker BullMQ + Redis para processamento assíncrono de mídia. **Sem lógica de negócio** — só o cableado das filas para a Epic 3 plugar.

## Filas

| Fila | Constante | Processador (Epic 3) |
| --- | --- | --- |
| `media:image` | `QUEUE_NAMES.image` | PHF-030 — `src/processors/image.js` |
| `media:reel` | `QUEUE_NAMES.reel` | PHF-031 — `src/processors/reel.js` |

Os processadores atuais lançam `not implemented` de propósito: qualquer job enfileirado antes da Epic 3 vai para `erro` (visível) em vez de ser marcado como concluído silenciosamente.

## Rodar

```sh
npm install
npm test            # smoke test, não precisa de Redis
REDIS_URL=redis://localhost:6379 npm start
```

## Onde a Epic 3 entra

- **Produtores** (API/Epic 2): `createQueue(QUEUE_NAMES.image, connection).add(...)`.
- **Consumidores** (Epic 3): trocar o corpo de `imageProcessor` / `reelProcessor`. O retry com backoff (`defaultJobOptions`) já cobre a base do PHF-033.

## Config

Ver `.env.example`. `REDIS_URL` (default `redis://localhost:6379`), `QUEUE_ATTEMPTS` (default 3).
