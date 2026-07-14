import { describe, expect, it } from "vitest";
import { caminhoOriginal, extDoMime, validarUpload, type UploadInput } from "./upload";

// Cobre os cenários Gherkin de 02-spec.md §5 (Feature: Upload) no gate do servidor.
const evento = { max_foto_mb: 25, max_reel_mb: 75 };

function input(over: Partial<UploadInput> = {}): UploadInput {
  return {
    tipo: "foto",
    autor: "Ana",
    mensagem: "Muito bom!",
    aceiteTermos: true,
    aceiteConteudo: true,
    mimeType: "image/jpeg",
    tamanhoBytes: 8 * 1024 * 1024, // 8MB
    ...over,
  };
}

describe("validarUpload", () => {
  it("aceita foto válida de 8MB com aceite duplo marcado", () => {
    expect(validarUpload(input(), evento)).toEqual({ ok: true });
  });

  it("rejeita sem aceite (nenhum registro deve ser criado)", () => {
    expect(validarUpload(input({ aceiteTermos: false }), evento).ok).toBe(false);
    expect(validarUpload(input({ aceiteConteudo: false }), evento).ok).toBe(false);
  });

  it("aceita reel de 60MB dentro do limite (max_reel_mb=75)", () => {
    const r = validarUpload(
      input({ tipo: "reel", mimeType: "video/mp4", tamanhoBytes: 60 * 1024 * 1024 }),
      evento,
    );
    expect(r).toEqual({ ok: true });
  });

  it("rejeita reel acima do limite de tamanho", () => {
    const r = validarUpload(
      input({ tipo: "reel", mimeType: "video/mp4", tamanhoBytes: 80 * 1024 * 1024 }),
      evento,
    );
    expect(r.ok).toBe(false);
  });

  it("rejeita foto acima do limite de tamanho (max_foto_mb=25)", () => {
    expect(validarUpload(input({ tamanhoBytes: 30 * 1024 * 1024 }), evento).ok).toBe(false);
  });

  it("rejeita mime não aceito para o tipo", () => {
    expect(validarUpload(input({ mimeType: "video/mp4" }), evento).ok).toBe(false); // mp4 como foto
    expect(validarUpload(input({ tipo: "reel", mimeType: "image/jpeg" }), evento).ok).toBe(false);
  });

  it("rejeita autor ou mensagem além do limite", () => {
    expect(validarUpload(input({ autor: "x".repeat(51) }), evento).ok).toBe(false);
    expect(validarUpload(input({ mensagem: "x".repeat(201) }), evento).ok).toBe(false);
  });
});

describe("helpers de path", () => {
  it("extDoMime mapeia mimes conhecidos e rejeita desconhecidos", () => {
    expect(extDoMime("image/jpeg")).toBe("jpg");
    expect(extDoMime("video/mp4")).toBe("mp4");
    expect(extDoMime("application/pdf")).toBeNull();
  });

  it("caminhoOriginal isola por evento no prefixo", () => {
    expect(caminhoOriginal("ev1", "m1", "jpg")).toBe("ev1/m1/original.jpg");
  });
});
