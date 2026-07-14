import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  handleImageJob,
  type MediaItem,
  type MediaRepo,
  type StoragePort,
} from '../src/job-handler.js';

function fakeStorage(initial: Record<string, Buffer>) {
  const store: Record<string, Buffer> = { ...initial };
  const port: StoragePort = {
    async get(key) {
      const b = store[key];
      if (!b) throw new Error(`missing ${key}`);
      return b;
    },
    async put(key, body) {
      store[key] = body;
      return `https://storage.local/${key}`;
    },
  };
  return { port, store };
}

function fakeRepo(item: MediaItem) {
  let current = item;
  const repo: MediaRepo = {
    async get() {
      return current;
    },
    async update(_id, patch) {
      current = { ...current, ...patch };
    },
  };
  return { repo, snapshot: () => current };
}

// Feature: Processamento assincrono de midia — 02-spec.md §5
//   Scenario: Foto processada gera thumbnail e remove EXIF
describe('handleImageJob — Gherkin: foto processada gera thumbnail e remove EXIF', () => {
  it('fills url_thumb/url_processada, sets exif_removido, keeps status pendente', async () => {
    // Given um media_item do tipo "foto" com status "pendente" na fila
    const original = await sharp({
      create: { width: 2400, height: 1600, channels: 3, background: { r: 200, g: 50, b: 50 } },
    })
      .withMetadata({ orientation: 3, exif: { IFD0: { Copyright: 'Ana' } } })
      .jpeg()
      .toBuffer();

    const { port: storage, store } = fakeStorage({ 'events/e1/orig.jpg': original });
    const item: MediaItem = {
      id: 'm1',
      event_id: 'e1',
      tipo: 'foto',
      status: 'pendente',
      url_original: 'events/e1/orig.jpg',
      url_processada: null,
      url_thumb: null,
      exif_removido: false,
    };
    const { repo, snapshot } = fakeRepo(item);

    // When o worker de imagem processa o item
    await handleImageJob({ mediaId: 'm1' }, { storage, media: repo });

    const after = snapshot();
    // Then url_thumb e url_processada sao preenchidos
    expect(after.url_processada).toBeTruthy();
    expect(after.url_thumb).toBeTruthy();
    // And exif_removido e definido como true
    expect(after.exif_removido).toBe(true);
    // And o item permanece com status "pendente" ate decisao do moderador
    expect(after.status).toBe('pendente');

    // The stored processed asset must truly carry no EXIF (PII scrubbed).
    const processedKey = after.url_processada!.replace('https://storage.local/', '');
    const processedMeta = await sharp(store[processedKey]!).metadata();
    expect(processedMeta.exif).toBeUndefined();
  });

  it('refuses to process a reel through the image worker', async () => {
    const { port: storage } = fakeStorage({ 'events/e1/clip.mp4': Buffer.from('fake') });
    const { repo } = fakeRepo({
      id: 'm2',
      event_id: 'e1',
      tipo: 'reel',
      status: 'pendente',
      url_original: 'events/e1/clip.mp4',
      url_processada: null,
      url_thumb: null,
      exif_removido: false,
    });
    await expect(handleImageJob({ mediaId: 'm2' }, { storage, media: repo })).rejects.toThrow(
      /not a foto/,
    );
  });
});
