import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Build config for the shareable review snapshot only.
 *
 * Kept separate from vite.config.ts so the application build is untouched:
 * this one has a different entry, emits to its own directory, and inlines
 * every asset so the result can be published as a single file.
 *
 *   npx vite build --config vite.snapshot.config.ts
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-snapshot',
    emptyOutDir: true,
    // One JS and one CSS file, so the inlining step downstream is trivial.
    cssCodeSplit: false,
    // Fonts and images become data URIs rather than separate requests, which
    // a strict CSP would block anyway.
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: fileURLToPath(new URL('./snapshot.html', import.meta.url)),
    },
  },
})
