import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // Casa o alias "@/*" do tsconfig para que os testes resolvam os mesmos imports do app.
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // ponytail: root vitest só roda os testes vitest do app (app/**, lib/**).
    // Os subprojetos (worker/, workers/, packages/) têm package.json e runner
    // próprios, e alguns testes de domínio usam node:test (`node --test`), não
    // vitest — varrê-los aqui quebra o `vitest run`. Upgrade: workspace vitest
    // ou script de teste dedicado por pacote quando o monorepo se firmar.
    exclude: [
      ...configDefaults.exclude,
      "worker/**",
      "workers/**",
      "packages/**",
      "lib/upload/validate-upload.test.ts",
    ],
  },
});
