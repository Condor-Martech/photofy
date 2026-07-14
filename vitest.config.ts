import { fileURLToPath } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

const dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  // Espelha o alias "@/*" -> "./*" do tsconfig.json para os testes.
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "app",
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
            "lib/dispositivos/revogar.test.ts",
            "lib/slideshow/slideshow-config.test.ts",
          ],
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          // Requer Playwright instalado (`npx playwright install chromium`) -- fora do
          // `npm test` padrão de propósito (mesma lógica de isolar subprojetos acima):
          // roda via `npm run test:storybook`, adicionar ao ci.yml só quando esse setup
          // estiver disponível no runner.
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
