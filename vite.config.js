import { defineConfig } from 'vite';
import { basePath } from './src/config.js';

export default defineConfig({
  base: basePath(process.env),
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
