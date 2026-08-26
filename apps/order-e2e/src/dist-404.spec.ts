/**
 * Vite-SPA-only: `apps/order` has no server, so GitHub Pages needs
 * `dist/order/404.html` to be a byte-copy of `dist/order/index.html` for a
 * hard-navigated deep link to render at all (D19 in
 * docs/prd-table-ordering.md). `playwright.config.ts`'s `webServer` step
 * produces that copy before `vite preview` starts.
 *
 * This assertion has no Next.js equivalent — Next answers every route with
 * a real file-system page and a 200, so there is no 404.html to copy.
 * Deleted by P7 in docs/trd-order-app-nextjs-migration.md alongside the rest
 * of the Vite app.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('dist/order/404.html is a byte-copy of index.html, as GitHub Pages needs for client routing (D19)', async () => {
  const distDir = path.resolve(__dirname, '../../../dist/order');
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'));
  const notFoundHtml = fs.readFileSync(path.join(distDir, '404.html'));

  expect(notFoundHtml.equals(indexHtml)).toBe(true);
});
