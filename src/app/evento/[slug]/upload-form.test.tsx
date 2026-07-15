import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import UploadForm from "./upload-form";

// Cobre o cenário Gherkin (02-spec.md §5): "Botão de envio bloqueado sem aceite".
describe("UploadForm — aceite duplo", () => {
  const arquivo = new File(["x"], "foto.jpg", { type: "image/jpeg" });

  it("mantém o botão desabilitado enquanto o aceite não está marcado", async () => {
    render(<UploadForm slug="lancamento-verao" />);
    const user = userEvent.setup();

    const botao = screen.getByRole("button", { name: /enviar/i });
    expect(botao).toBeDisabled();

    // Arquivo selecionado, mas sem aceite → segue desabilitado.
    await user.upload(screen.getByLabelText(/foto ou reel/i), arquivo);
    expect(botao).toBeDisabled();

    // Só um dos dois aceites → segue desabilitado.
    await user.click(screen.getByRole("checkbox", { name: /aceito os termos/i }));
    expect(botao).toBeDisabled();
  });

  it("habilita o botão com arquivo + aceite duplo", async () => {
    render(<UploadForm slug="lancamento-verao" />);
    const user = userEvent.setup();

    await user.upload(screen.getByLabelText(/foto ou reel/i), arquivo);
    await user.click(screen.getByRole("checkbox", { name: /aceito os termos/i }));
    await user.click(screen.getByRole("checkbox", { name: /conteúdo enviado/i }));

    expect(screen.getByRole("button", { name: /enviar/i })).toBeEnabled();
  });
});
