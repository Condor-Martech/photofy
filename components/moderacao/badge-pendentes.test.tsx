import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BadgePendentes } from "./badge-pendentes";

describe("BadgePendentes", () => {
  it("exibe o total e um rótulo acessível", () => {
    render(<BadgePendentes total={7} />);
    const badge = screen.getByRole("status", { name: /7 itens pendentes/i });
    expect(badge).toHaveTextContent("7");
  });
});
