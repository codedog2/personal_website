import { defineConfig } from 'vite';
import { basePath } from './src/config.js';

export default defineConfig({
  base: basePath(process.env),
  build: { target: 'es2022' },   // modern desktop browsers only (spec §3); allows top-level await
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.js'],
  },
});
