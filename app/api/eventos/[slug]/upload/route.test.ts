import { beforeEach, describe, expect, it, vi } from "vitest";

// Estado controlável do "banco" falso, por teste.
const state: { evento: unknown; item: unknown; inserted: Record<string, unknown>[] } = {
  evento: null,
  item: null,
  inserted: [],
};
const enqueue = vi.fn();

function ok(data: unknown) {
  return { data, error: null };
}

function fakeDb() {
  return {
    from(table: string) {
      if (table === "events") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ok(state.evento) }) }),
        };
      }
      if (table === "media_items") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ok(state.item) }) }),
          insert: async (row: Record<string, unknown>) => {
            state.inserted.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`tabela inesperada: ${table}`);
    },
    storage: {
      from: () => ({
        createSignedUploadUrl: async (path: string) =>
          ok({ signedUrl: `https://signed/${path}`, token: "tok" }),
      }),
    },
  };
}

vi.mock("@/lib/supabase-server", () => ({
  MEDIA_BUCKET: "media",
  supabaseAdmin: () => fakeDb(),
}));
vi.mock("@/lib/queue", () => ({
  enqueueProcessing: (...args: unknown[]) => enqueue(...args),
}));

import { POST as upload } from "@/app/api/eventos/[slug]/upload/route";
import { POST as confirmar } from "@/app/api/eventos/[slug]/upload/confirmar/route";

function req(body: unknown) {
  return new Request("http://t/upload", { method: "POST", body: JSON.stringify(body) });
}
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

const uploadBody = {
  tipo: "foto",
  autor: "Ana",
  mensagem: "Muito bom!",
  aceiteTermos: true,
  aceiteConteudo: true,
  mimeType: "image/jpeg",
  tamanhoBytes: 8 * 1024 * 1024,
};

beforeEach(() => {
  state.evento = { id: "ev1", status: "ativo", max_foto_mb: 25, max_reel_mb: 75 };
  state.item = null;
  state.inserted = [];
  enqueue.mockClear();
});

describe("POST /upload", () => {
  it("cria media_item pendente e devolve URL pré-assinada (201)", async () => {
    const res = await upload(req(uploadBody), params("lancamento-verao"));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.uploadUrl).toContain("https://signed/ev1/");
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0]).toMatchObject({ event_id: "ev1", tipo: "foto", status: "pendente" });
  });

  it("rejeita sem aceite e não cria nada (422)", async () => {
    const res = await upload(req({ ...uploadBody, aceiteTermos: false }), params("lancamento-verao"));
    expect(res.status).toBe(422);
    expect(state.inserted).toHaveLength(0);
  });

  it("404 quando o evento não existe", async () => {
    state.evento = null;
    const res = await upload(req(uploadBody), params("inexistente"));
    expect(res.status).toBe(404);
  });
});

describe("POST /upload/confirmar", () => {
  it("enfileira processamento do item do evento", async () => {
    state.item = { id: "m1", tipo: "foto", event_id: "ev1" };
    const res = await confirmar(req({ mediaId: "m1" }), params("lancamento-verao"));
    expect(res.status).toBe(200);
    expect(enqueue).toHaveBeenCalledWith("m1", "foto");
  });

  it("404 e não enfileira item de outro evento (isolamento)", async () => {
    state.item = { id: "m1", tipo: "foto", event_id: "OUTRO" };
    const res = await confirmar(req({ mediaId: "m1" }), params("lancamento-verao"));
    expect(res.status).toBe(404);
    expect(enqueue).not.toHaveBeenCalled();
  });
});
