/// <reference types='vitest' />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import path from 'path';

// Served under GitHub Pages alongside docs-site (D18/D19/FR-9 in
// docs/prd-table-ordering.md): `dist/order/` is a sub-path of the repo's
// single Pages site, so the production build must be rooted there. Local
// dev keeps '/' so `nx serve order` behaves like any other Vite app.
const PAGES_BASE = '/gatherloop-pos/order/';

// libs/ui/src/config.ts (the web build of the shared Tamagui config,
// resolved here since Vite has no Metro-style `.native.ts` fallback) uses
// @tamagui/animations-css, not the moti/Reanimated driver — the moti
// driver resolves an animated view's style to an array instead of a merged
// object, which crashes web's CSSStyleDeclaration. Nothing in the web
// bundle should reach @tamagui/animations-moti -> moti/author ->
// react-native-reanimated any more, but these stubs (shared with
// Storybook, which hit the exact same import chain first) stay as a
// defensive backstop in case something pulls that chain in again.
const storybookMocksDir = path.resolve(
  __dirname,
  '../../libs/ui/.storybook/mocks'
);

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  // @tamagui/vite-plugin ships ESM-only. Nx's own project-graph config
  // loader CJS-requires vite.config.ts to discover targets, which crashes
  // on a static `import` of an ESM-only package — a dynamic import inside
  // the (already async-capable) `defineConfig` factory defers resolution
  // to Vite's own loader instead, which handles it correctly.
  const { tamaguiPlugin } = await import('@tamagui/vite-plugin');

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/order',
    base: mode === 'production' ? PAGES_BASE : '/',

    server: {
      port: 4200,
      host: 'localhost',
    },

    preview: {
      port: 4300,
      host: 'localhost',
    },

    resolve: {
      alias: {
        'react-native-reanimated': path.join(
          storybookMocksDir,
          'react-native-reanimated.js'
        ),
        'moti/author': path.join(storybookMocksDir, 'moti-author.js'),
      },
    },

    define: {
      __VITE_API_BASE_URL__: JSON.stringify(env['VITE_API_BASE_URL'] ?? ''),
      // FR-8/D10 in docs/prd-table-ordering.md: kill switch for the QRIS
      // checkout stub, default false. Coerced to a real boolean here so
      // `app/Checkout.tsx` can declare it as `boolean | undefined` rather
      // than parsing a string at runtime.
      __VITE_ORDER_CHECKOUT_ENABLED__: JSON.stringify(
        env['VITE_ORDER_CHECKOUT_ENABLED'] === 'true'
      ),
    },

    plugins: [tamaguiPlugin({ disableWatchTamaguiConfig: true }), react(), nxViteTsPaths()],

    build: {
      outDir: '../../dist/order',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
