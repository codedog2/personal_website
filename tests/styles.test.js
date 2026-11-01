import { readFileSync } from 'node:fs';

const chrome = readFileSync('src/styles/chrome.css', 'utf8')   // vitest runs from the repo root;

test('canvas cursor/touch rules target #gl directly (the canvas is not inside the .oa3d shell)', () => {
  expect(chrome).not.toMatch(/\.oa3d\s+#gl/);
  expect(chrome).toMatch(/#gl\.active\s*\{[^}]*touch-action:\s*none/);
  expect(chrome).toMatch(/#gl\.active\.dragging/);
});

test('3D reader text has a readable floor on small windows', () => {
  expect(chrome).toMatch(/\.reader\s*>\s*\.paper\s*\{[^}]*--u:\s*max\(1cqw,\s*9px\)/);
});
