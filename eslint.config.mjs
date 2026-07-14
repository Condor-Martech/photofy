// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import storybook from "eslint-plugin-storybook";
import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";

// eslint-config-next ainda exporta CommonJS legado (`{ extends: [...] }`),
// não flat config nativa. Usamos FlatCompat para adaptar em runtime até que
// o próprio eslint-config-next migre — evita "nextVitals is not iterable"
// que aparece com spread direto do objeto CommonJS em ESLint 9 flat config.
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = defineConfig([
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("next/typescript"),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "storybook-static/**",
    "next-env.d.ts",
  ]),
  ...storybook.configs["flat/recommended"]
]);

export default eslintConfig;
