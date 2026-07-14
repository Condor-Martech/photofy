// Cobre os cenários Gherkin de 02-spec.md §5 relativos à validação client-side:
//  - "Reel dentro do limite é aceito para processamento"
//  - "Reel fora do limite é rejeitado no cliente"
//  - (foto válida / formatos / tamanho, derivados dos mesmos limites)
//
// Roda sem framework: `node --test lib/upload/validate-upload.test.ts`
// (Node 22.18+/24 fazem type-stripping de .ts nativamente).
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarUpload, type EventoLimites, type ResultadoValidacao } from "./validate-upload.ts";

const MB = 1024 * 1024;
const LIMITES: EventoLimites = {
  formatos_aceitos: ["jpg", "png", "heic", "mp4"],
  max_foto_mb: 25,
  max_reel_mb: 75,
  max_reel_seg: 10,
};

const erroDe = (r: ResultadoValidacao) => (r.ok ? "" : r.erro);

test("reel dentro do limite (60MB, 9s, mp4) é aceito e enfileirado", () => {
  const r = validarUpload({ type: "video/mp4", size: 60 * MB, name: "reel.mp4" }, LIMITES, 9);
  assert.deepEqual(r, { ok: true, tipo: "reel" });
});

test("reel de 14s é rejeitado no cliente com mensagem sobre a duração", () => {
  const r = validarUpload({ type: "video/mp4", size: 10 * MB, name: "reel.mp4" }, LIMITES, 14);
  assert.equal(r.ok, false);
  assert.match(erroDe(r), /segundos|duração|longo/i);
});

test("foto válida (8MB jpg) é aceita como tipo foto", () => {
  const r = validarUpload({ type: "image/jpeg", size: 8 * MB, name: "foto.jpg" }, LIMITES);
  assert.deepEqual(r, { ok: true, tipo: "foto" });
});

test("formato não suportado (mov) é rejeitado", () => {
  const r = validarUpload({ type: "video/quicktime", size: 5 * MB, name: "v.mov" }, LIMITES);
  assert.equal(r.ok, false);
});

test("foto acima de max_foto_mb é rejeitada por tamanho", () => {
  const r = validarUpload({ type: "image/png", size: 30 * MB, name: "g.png" }, LIMITES);
  assert.equal(r.ok, false);
  assert.match(erroDe(r), /MB/);
});

test("reel acima de max_reel_mb é rejeitado por tamanho", () => {
  const r = validarUpload({ type: "video/mp4", size: 80 * MB, name: "big.mp4" }, LIMITES, 8);
  assert.equal(r.ok, false);
  assert.match(erroDe(r), /MB/);
});

test("HEIC sem MIME usa o fallback pela extensão do nome", () => {
  const r = validarUpload({ type: "", size: 5 * MB, name: "IMG_0001.HEIC" }, LIMITES);
  assert.deepEqual(r, { ok: true, tipo: "foto" });
});

test("reel sem duração legível passa no cliente (servidor valida — PHF-031)", () => {
  const r = validarUpload({ type: "video/mp4", size: 10 * MB, name: "reel.mp4" }, LIMITES, undefined);
  assert.deepEqual(r, { ok: true, tipo: "reel" });
});

test("borda: 10,02s conta como 10s e é aceito (metadados imprecisos)", () => {
  const r = validarUpload({ type: "video/mp4", size: 10 * MB, name: "reel.mp4" }, LIMITES, 10.02);
  assert.equal(r.ok, true);
});

test("limite de duração é por evento (max_reel_seg=5 rejeita 7s)", () => {
  const limites5: EventoLimites = { ...LIMITES, max_reel_seg: 5 };
  const r = validarUpload({ type: "video/mp4", size: 10 * MB, name: "r.mp4" }, limites5, 7);
  assert.equal(r.ok, false);
});
