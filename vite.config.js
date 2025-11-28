import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [svelte()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true
  }
});
