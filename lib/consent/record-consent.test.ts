// PHF-023 — cobre os cenários Gherkin de consentimento (02-spec.md §5, Feature "Upload"):
//   * "Envio de foto válida com aceite marcado" -> consent_record com aceite_termos=true
//     e aceite_conteudo=true.
//   * "Botão de envio bloqueado sem aceite" -> NENHUM registro é criado.
// Mais as garantias LGPD do servidor: IP nunca gravado cru, versionamento, fail-closed.

import { describe, expect, it, vi } from "vitest";
import {
  registrarConsentimento,
  type ConsentRow,
  type ConsentWriter,
} from "./record-consent";

function writerFake() {
  const rows: ConsentRow[] = [];
  const writer: ConsentWriter = {
    insert: vi.fn(async (row: ConsentRow) => {
      rows.push(row);
      return { id: "consent-1" };
    }),
  };
  return { writer, rows };
}

const SALT = "salt-de-teste";

describe("registrarConsentimento", () => {
  it("grava consent_record com aceite duplo quando termos e conteúdo são aceitos", async () => {
    const { writer, rows } = writerFake();
    const res = await registrarConsentimento(
      {
        mediaId: "media-1",
        aceiteTermos: true,
        aceiteConteudo: true,
        ip: "203.0.113.9",
        userAgent: "Mozilla/5.0",
        versaoTermos: "v1",
      },
      writer,
      SALT,
    );

    expect(res).toEqual({ ok: true, id: "consent-1" });
    expect(rows).toHaveLength(1);
    expect(rows[0].aceite_termos).toBe(true);
    expect(rows[0].aceite_conteudo).toBe(true);
    expect(rows[0].versao_termos).toBe("v1");
    expect(rows[0].user_agent).toBe("Mozilla/5.0");
  });

  it("NÃO cria registro quando o aceite não está completo", async () => {
    const { writer, rows } = writerFake();

    for (const [termos, conteudo] of [
      [false, false],
      [true, false],
      [false, true],
    ] as const) {
      const res = await registrarConsentimento(
        { mediaId: "m", aceiteTermos: termos, aceiteConteudo: conteudo, ip: "1.1.1.1", versaoTermos: "v1" },
        writer,
        SALT,
      );
      expect(res.ok).toBe(false);
    }

    expect(writer.insert).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });

  it("nunca persiste o IP cru — só o hash salgado (LGPD)", async () => {
    const { rows } = writerFake();
    const writer: ConsentWriter = { insert: async (row) => (rows.push(row), { id: "x" }) };

    await registrarConsentimento(
      { mediaId: "m", aceiteTermos: true, aceiteConteudo: true, ip: "203.0.113.9", versaoTermos: "v1" },
      writer,
      SALT,
    );

    expect(rows[0].ip_hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(rows[0].ip_hash).not.toContain("203.0.113.9");
    expect(rows[0].user_agent).toBeNull(); // opcional ausente vira null explícito
  });

  it("o mesmo IP + salt produz o mesmo hash (determinístico p/ auditoria)", async () => {
    const { rows } = writerFake();
    const writer: ConsentWriter = { insert: async (row) => (rows.push(row), { id: "x" }) };
    const input = { mediaId: "m", aceiteTermos: true, aceiteConteudo: true, ip: "8.8.8.8", versaoTermos: "v1" } as const;

    await registrarConsentimento(input, writer, SALT);
    await registrarConsentimento(input, writer, SALT);
    expect(rows[0].ip_hash).toBe(rows[1].ip_hash);
  });

  it("exige versao_termos (consentimento versionado)", async () => {
    const { writer } = writerFake();
    const res = await registrarConsentimento(
      { mediaId: "m", aceiteTermos: true, aceiteConteudo: true, ip: "1.1.1.1", versaoTermos: "  " },
      writer,
      SALT,
    );
    expect(res.ok).toBe(false);
    expect(writer.insert).not.toHaveBeenCalled();
  });

  it("falha fechado quando o salt do hash de IP não está configurado", async () => {
    const { writer } = writerFake();
    await expect(
      registrarConsentimento(
        { mediaId: "m", aceiteTermos: true, aceiteConteudo: true, ip: "1.1.1.1", versaoTermos: "v1" },
        writer,
        undefined,
      ),
    ).rejects.toThrow(/CONSENT_IP_HASH_SALT/);
    expect(writer.insert).not.toHaveBeenCalled();
  });
});
