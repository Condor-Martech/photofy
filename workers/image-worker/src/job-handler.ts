import { processImage } from './process-image.js';

export type MediaStatus = 'pendente' | 'aprovado' | 'reprovado' | 'erro';

export interface MediaItem {
  id: string;
  event_id: string;
  tipo: 'foto' | 'reel';
  status: MediaStatus;
  url_original: string;
  url_processada: string | null;
  url_thumb: string | null;
  exif_removido: boolean;
}

// Ports injected by the queue skeleton (PHF-013) — kept abstract so this worker
// stays testable with fakes and does not couple to a concrete Supabase client.
export interface StoragePort {
  get(key: string): Promise<Buffer>;
  put(key: string, body: Buffer, contentType: string): Promise<string>;
}

export interface MediaRepo {
  get(id: string): Promise<MediaItem>;
  update(id: string, patch: Partial<MediaItem>): Promise<void>;
}

export interface ImageJobData {
  mediaId: string;
}

export interface ImageJobDeps {
  storage: StoragePort;
  media: MediaRepo;
}

function derivedKey(originalKey: string, suffix: string): string {
  const dot = originalKey.lastIndexOf('.');
  const stem = dot === -1 ? originalKey : originalKey.slice(0, dot);
  return `${stem}_${suffix}.jpg`;
}

export async function handleImageJob(data: ImageJobData, deps: ImageJobDeps): Promise<void> {
  const item = await deps.media.get(data.mediaId);
  if (item.tipo !== 'foto') {
    throw new Error(`media ${item.id} is not a foto (tipo=${item.tipo})`);
  }

  const input = await deps.storage.get(item.url_original);
  const { telao, thumbnail } = await processImage(input);

  const [url_processada, url_thumb] = await Promise.all([
    deps.storage.put(derivedKey(item.url_original, 'telao'), telao, 'image/jpeg'),
    deps.storage.put(derivedKey(item.url_original, 'thumb'), thumbnail, 'image/jpeg'),
  ]);

  // Status stays "pendente": processing prepares the assets but NEVER pre-empts
  // the human moderation decision (domain rule, 02-spec.md §5 / CLAUDE.md).
  await deps.media.update(item.id, {
    url_processada,
    url_thumb,
    exif_removido: true,
  });
}
