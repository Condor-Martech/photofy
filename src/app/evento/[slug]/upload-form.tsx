"use client";

import { useState } from "react";

export const AUTOR_MAX = 50;
export const MENSAGEM_MAX = 200;

export default function UploadForm({ slug }: { slug: string }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [aceiteConteudo, setAceiteConteudo] = useState(false);

  // Gherkin §5 "Botão de envio bloqueado sem aceite": só habilita com arquivo + aceite duplo.
  const podeEnviar = arquivo !== null && aceiteTermos && aceiteConteudo;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // ponytail: envio real (URL pré-assinada + confirmação + consent_record) é PHF-021/023.
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <input
        type="file"
        accept="image/*,video/*"
        aria-label="Foto ou reel"
        onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
      />

      <input
        type="text"
        placeholder="Seu nome (opcional)"
        aria-label="Autor"
        maxLength={AUTOR_MAX}
        className="rounded border p-2"
      />

      <textarea
        placeholder="Uma mensagem (opcional)"
        aria-label="Mensagem"
        maxLength={MENSAGEM_MAX}
        className="rounded border p-2"
      />

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={aceiteTermos}
          onChange={(e) => setAceiteTermos(e.target.checked)}
        />
        <span>Li e aceito os termos do evento.</span>
      </label>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={aceiteConteudo}
          onChange={(e) => setAceiteConteudo(e.target.checked)}
        />
        <span>Responsabilizo-me pelo conteúdo enviado (nada impróprio).</span>
      </label>

      <button
        type="submit"
        disabled={!podeEnviar}
        className="rounded bg-black p-3 text-white disabled:opacity-50"
      >
        Enviar
      </button>
    </form>
  );
}
