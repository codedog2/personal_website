import { defineConfig } from 'vite';
import { basePath } from './src/config.js';

export default defineConfig({
  base: basePath(process.env),
  build: { target: 'es2022', chunkSizeWarningLimit: 800 },   // modern browsers only (spec §3); three.js is a lazy chunk
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.js'],
  },
});
