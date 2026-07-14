import type { Config } from "tailwindcss";

// Mobile-first é requisito não-negociável (SPEC §1.1 / Epic 10): a persona Participante usa celular.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
