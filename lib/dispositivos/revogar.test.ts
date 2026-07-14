// Cobre o cenário Gherkin de 02-spec.md §5 (Feature: Slideshow no telão):
//   "Revogação de uma tela não afeta as demais"
//
// Roda sem framework: `node --test lib/dispositivos/revogar.test.ts`
// (Node 22.18+/24 fazem type-stripping de .ts nativamente).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  revogarEmMemoria,
  revogarNoSupabase,
  tokenValido,
  type Device,
  type DevicesRevokeClient,
} from "./revogar.ts";

const duasTelasMesmoEvento = (): Device[] => [
  { id: "entrada", event_id: "ev-1", status: "pareado" },
  { id: "salao-principal", event_id: "ev-1", status: "pareado" },
];

test("revogação de uma tela não afeta as demais (Gherkin §5)", () => {
  const devices = duasTelasMesmoEvento();

  const r = revogarEmMemoria(devices, "entrada");

  // o token de "entrada" deixa de ser válido
  assert.equal(r.revogado, true);
  assert.equal(r.revogado && r.device.status, "revogado");
  assert.equal(tokenValido(devices.find((d) => d.id === "entrada")), false);

  // "salao-principal" continua recebendo atualizações normalmente
  const salao = devices.find((d) => d.id === "salao-principal")!;
  assert.equal(salao.status, "pareado");
  assert.equal(tokenValido(salao), true);
});

test("revogar device inexistente não toca em nenhum outro", () => {
  const devices = duasTelasMesmoEvento();
  const r = revogarEmMemoria(devices, "fantasma");
  assert.deepEqual(r, { revogado: false, motivo: "nao_encontrado" });
  assert.ok(devices.every((d) => d.status === "pareado"));
});

test("revogação é idempotente", () => {
  const devices = duasTelasMesmoEvento();
  revogarEmMemoria(devices, "entrada");
  const r2 = revogarEmMemoria(devices, "entrada");
  assert.equal(r2.revogado, true);
  assert.equal(devices.find((d) => d.id === "salao-principal")!.status, "pareado");
});

// Adaptador Supabase: prova que o UPDATE é escopado por PK — `.eq("id", <alvo>)`
// e nada mais amplo. Um fake registra o filtro usado.
test("revogarNoSupabase filtra por id do alvo e por nada mais amplo", async () => {
  let filtro: { col: string; id: string } | null = null;

  const fake: DevicesRevokeClient = {
    from: () => ({
      update: () => ({
        eq: (col, id) => {
          filtro = { col, id };
          return {
            select: () => ({
              maybeSingle: async () => ({
                data: { id, event_id: "ev-1", status: "revogado" } as Device,
                error: null,
              }),
            }),
          };
        },
      }),
    }),
  };

  const r = await revogarNoSupabase(fake, "entrada");

  assert.deepEqual(filtro, { col: "id", id: "entrada" });
  assert.equal(r.revogado && r.device.id, "entrada");
});

test("revogarNoSupabase devolve nao_encontrado quando não há linha", async () => {
  const fake: DevicesRevokeClient = {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
      }),
    }),
  };
  assert.deepEqual(await revogarNoSupabase(fake, "sumido"), {
    revogado: false,
    motivo: "nao_encontrado",
  });
});
