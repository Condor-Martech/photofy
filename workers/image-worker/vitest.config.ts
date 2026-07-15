import { defineConfig } from 'vitest/config';

export default defineConfig({
  // postcss inline vazio: impede o vite de subir a arvore e carregar o
  // postcss.config.js do app Next.js na raiz (que exige tailwindcss, ausente aqui).
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    globals: true,
  },
});
