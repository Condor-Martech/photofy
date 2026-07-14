# Storage de mídia — bucket privado e URLs pré-assinadas (PHF-012)

Contrato de acesso à mídia. **Risco alto**: qualquer PR que enfraqueça estas regras deve ser rejeitado no review.

## Bucket

- Bucket único **`media`**, **privado** (`public = false`). Criado em `supabase/migrations/20260713203000_phf012_private_media_bucket.sql`.
- Limite de tamanho: **75 MiB** (maior limite do domínio, `max_reel_mb`). O limite fino por tipo (foto 25 MB / reel 75 MB) é validado no cliente (PHF-022) e no endpoint (PHF-021).
- MIME aceitos: `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `video/mp4`.

## Regra de acesso (inegociável)

Não há acesso público direto. `storage.objects` fica em **deny-by-default** (RLS habilitado, sem política permissiva para `anon`/`authenticated`). O **único** caminho de leitura é uma **URL pré-assinada gerada no servidor** com `service_role` e **expiração curta**.

- Leitura → `MEDIA_SIGNED_URL_TTL_SECONDS = 300` (5 min). Use em `createSignedUrl(path, MEDIA_SIGNED_URL_TTL_SECONDS)` (PHF-021, galeria, telão).
- Upload → `createSignedUploadUrl(path)` (token de uso único, curta duração) a partir do backend (PHF-021).
- **Nunca** exponha `service_role` ao cliente nem gere URL pré-assinada de longa duração para contornar a regra.

## Escopo por evento

Objetos são gravados sob o prefixo do evento:

```
<event_id>/<media_id>/original.<ext>
<event_id>/<media_id>/processada.<ext>
<event_id>/<media_id>/thumb.<ext>
```

Isso isola a mídia por evento no path. RLS por `event_id` em `storage.objects` (caso alguma política de acesso direto por role venha a ser concedida a moderador/admin) é responsabilidade de **PHF-011**.

## Como verificar

```bash
supabase test db   # roda supabase/tests/phf012_private_media_bucket_test.sql (requer stack local de PHF-010)
```
