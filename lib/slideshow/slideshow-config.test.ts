// PHF-052 — cobre a Feature "Slideshow no telão" (02-spec.md §5) na parte de
// parâmetros configuráveis + os ranges do SPEC. Roda sem scaffold:
//   node --test lib/slideshow/slideshow-config.test.ts   (Node >= 23)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLIDESHOW_DEFAULTS,
  validateSlideshowConfigPatch,
  withDefaults,
  buildPlaylist,
  type MediaLike,
} from './slideshow-config.ts';

const item = (id: string, tipo: MediaLike['tipo'], status: string, criado_em: string): MediaLike => ({
  id,
  tipo,
  status,
  criado_em,
});

// --- Gherkin: "Slideshow exibe apenas conteúdo aprovado, respeitando configuração"
// slideshow_config: seg_por_slide=6, ordem="recentes", incluir_reels=true
// 5 aprovados + 2 pendentes → só os 5 aprovados entram na rotação.
test('rotação inclui só os aprovados, respeitando a config', () => {
  const config = withDefaults({ seg_por_slide: 6, ordem: 'recentes', incluir_reels: true });
  const items: MediaLike[] = [
    item('a', 'foto', 'aprovado', '2026-07-14T10:00:00Z'),
    item('b', 'foto', 'aprovado', '2026-07-14T10:01:00Z'),
    item('c', 'reel', 'aprovado', '2026-07-14T10:02:00Z'),
    item('d', 'foto', 'aprovado', '2026-07-14T10:03:00Z'),
    item('e', 'foto', 'aprovado', '2026-07-14T10:04:00Z'),
    item('p1', 'foto', 'pendente', '2026-07-14T10:05:00Z'),
    item('p2', 'reel', 'pendente', '2026-07-14T10:06:00Z'),
  ];
  const playlist = buildPlaylist(items, config);
  assert.equal(playlist.length, 5);
  assert.ok(playlist.every((it) => it.status === 'aprovado'));
  assert.equal(config.seg_por_slide, 6); // cada slide 6s (consumido pelo player)
  // "recentes" = mais novo primeiro
  assert.deepEqual(playlist.map((it) => it.id), ['e', 'd', 'c', 'b', 'a']);
});

test('ordem cronologica = mais antigos primeiro', () => {
  const config = withDefaults({ ordem: 'cronologica' });
  const items: MediaLike[] = [
    item('novo', 'foto', 'aprovado', '2026-07-14T10:02:00Z'),
    item('velho', 'foto', 'aprovado', '2026-07-14T10:00:00Z'),
    item('meio', 'foto', 'aprovado', '2026-07-14T10:01:00Z'),
  ];
  assert.deepEqual(buildPlaylist(items, config).map((i) => i.id), ['velho', 'meio', 'novo']);
});

test('incluir_reels=false remove reels da rotação', () => {
  const config = withDefaults({ incluir_reels: false });
  const items: MediaLike[] = [
    item('f', 'foto', 'aprovado', '2026-07-14T10:00:00Z'),
    item('r', 'reel', 'aprovado', '2026-07-14T10:01:00Z'),
  ];
  const playlist = buildPlaylist(items, config);
  assert.deepEqual(playlist.map((i) => i.id), ['f']);
});

test('ordem aleatoria usa rng injetável e mantém todos os aprovados', () => {
  const config = withDefaults({ ordem: 'aleatoria' });
  const items: MediaLike[] = ['a', 'b', 'c', 'd'].map((id, i) =>
    item(id, 'foto', 'aprovado', `2026-07-14T10:0${i}:00Z`),
  );
  const rng = () => 0; // determinístico: Fisher-Yates com j=0 sempre
  const playlist = buildPlaylist(items, config, rng);
  assert.equal(playlist.length, 4);
  assert.deepEqual([...playlist.map((i) => i.id)].sort(), ['a', 'b', 'c', 'd']);
});

// --- Validação dos ranges do SPEC (02-spec.md §3, tabela slideshow_config) ---

test('defaults batem com os defaults do schema', () => {
  assert.deepEqual(SLIDESHOW_DEFAULTS, {
    seg_por_slide: 6,
    ordem: 'recentes',
    transicao: 'fade',
    exibir_autor_mensagem: true,
    incluir_reels: true,
    duracao_reel_telao: 'completo',
    loop: true,
    escurecimento_bg: 30,
  });
});

test('PATCH válido passa sem erros e devolve só os campos enviados', () => {
  const { value, errors } = validateSlideshowConfigPatch({ seg_por_slide: 10, ordem: 'aleatoria' });
  assert.deepEqual(errors, []);
  assert.deepEqual(value, { seg_por_slide: 10, ordem: 'aleatoria' });
});

test('seg_por_slide fora de 3..30 é rejeitado', () => {
  for (const bad of [2, 31, 0, 100]) {
    const { errors } = validateSlideshowConfigPatch({ seg_por_slide: bad });
    assert.equal(errors.length, 1, `esperava erro para ${bad}`);
    assert.equal(errors[0].field, 'seg_por_slide');
  }
  for (const ok of [3, 6, 30]) {
    assert.deepEqual(validateSlideshowConfigPatch({ seg_por_slide: ok }).errors, []);
  }
});

test('escurecimento_bg fora de 0..80 é rejeitado', () => {
  assert.equal(validateSlideshowConfigPatch({ escurecimento_bg: -1 }).errors.length, 1);
  assert.equal(validateSlideshowConfigPatch({ escurecimento_bg: 81 }).errors.length, 1);
  assert.deepEqual(validateSlideshowConfigPatch({ escurecimento_bg: 0 }).errors, []);
  assert.deepEqual(validateSlideshowConfigPatch({ escurecimento_bg: 80 }).errors, []);
});

test('enums fora do domínio são rejeitados', () => {
  assert.equal(validateSlideshowConfigPatch({ ordem: 'zigzag' }).errors[0].field, 'ordem');
  assert.equal(validateSlideshowConfigPatch({ transicao: 'wipe' }).errors[0].field, 'transicao');
  assert.equal(validateSlideshowConfigPatch({ duracao_reel_telao: 'meio' }).errors[0].field, 'duracao_reel_telao');
});

test('tipos errados e parâmetro desconhecido são rejeitados', () => {
  assert.equal(validateSlideshowConfigPatch({ loop: 'sim' }).errors[0].field, 'loop');
  assert.equal(validateSlideshowConfigPatch({ seg_por_slide: 6.5 }).errors[0].field, 'seg_por_slide');
  assert.equal(validateSlideshowConfigPatch({ cor_fundo: '#000' }).errors[0].message, 'parâmetro desconhecido');
  assert.equal(validateSlideshowConfigPatch(null).errors.length, 1);
  assert.equal(validateSlideshowConfigPatch([1, 2]).errors.length, 1);
});
