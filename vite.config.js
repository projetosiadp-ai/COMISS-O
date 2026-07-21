import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// A CSP em index.html usa style-src 'self', o que bloqueia as tags <style>
// inline que o Vite injeta em modo dev para CSS/HMR. Relaxamos isso só em
// dev; o build de produção gera um <link> de CSS externo, que já respeita
// style-src 'self' normalmente.
function devCspFix() {
  return {
    name: 'dev-csp-fix',
    apply: 'serve',
    transformIndexHtml(html) {
      return html.replace(
        "style-src 'self';",
        "style-src 'self' 'unsafe-inline';"
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    devCspFix(),
    nodePolyfills({
      include: ['stream', 'util', 'buffer', 'process', 'zlib', 'events'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  base: './',
  server: {
    port: 5173,
    strictPort: true,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
