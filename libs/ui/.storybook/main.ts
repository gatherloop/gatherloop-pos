import type { StorybookConfig } from '@storybook/react-vite';
import fs from 'fs';
import path from 'path';

// Exclude every @tamagui/* package from esbuild pre-bundling.
// These packages ship JSX / native-only code that esbuild cannot process;
// Rollup (Vite's regular pipeline) handles them correctly via resolve.alias.
const tamaguiExcludes = fs
  .readdirSync(path.resolve(__dirname, '../../../node_modules/@tamagui'))
  .map((name) => `@tamagui/${name}`);

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {
      // Disable React Strict Mode to prevent the double-invocation of
      // useLayoutEffect during development. Strict Mode simulates an
      // unmount+remount cycle on every mount; Tamagui's internal effects
      // create and clean up DOM nodes during this cycle in a way that can
      // leave stale references, causing an insertBefore NotFoundError when
      // React next tries to commit portal-based components (Sheet, Dialog,
      // AlertDialog, etc.).
      strictMode: false,
    },
  },
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  async viteFinal(viteConfig) {
    const { mergeConfig } = await import('vite');

    return mergeConfig(viteConfig, {
      resolve: {
        alias: [
          // @react-native/normalize-colors ships a plain CJS file (module.exports = fn).
          // Vite's esbuild JSX loader strips the `module` global, causing
          // "Cannot set properties of undefined (setting 'exports')".
          // We redirect to a hand-written ESM copy that uses `export default`.
          {
            find: /^@react-native\/normalize-colors$/,
            replacement: path.resolve(__dirname, './mocks/normalize-colors.js'),
          },
          // @tamagui/normalize-css-color imports the SINGULAR form of the same package.
          // Both packages have identical content; the same ESM mock handles both.
          {
            find: /^@react-native\/normalize-color$/,
            replacement: path.resolve(__dirname, './mocks/normalize-colors.js'),
          },
          // Redirect react-native-svg to its built-in web implementation
          // (ReactNativeSVG.web.js) which uses DOM SVG and has zero
          // fabric/TurboModule imports. Must come before the react-native
          // alias so sub-path imports inside react-native-svg don't get
          // incorrectly rewritten.
          {
            find: /^react-native-svg$/,
            replacement: path.resolve(
              __dirname,
              '../../../node_modules/react-native-svg/lib/commonjs/ReactNativeSVG.web.js'
            ),
          },
          // Mock codegenNativeComponent — a Fabric/TurboModules native API
          // that react-native-svg's <Use> element pulls in. react-native-web
          // has no equivalent; a no-op stub is sufficient for web rendering.
          {
            find: /^react-native\/Libraries\/Utilities\/codegenNativeComponent$/,
            replacement: path.resolve(
              __dirname,
              './mocks/codegenNativeComponent.js'
            ),
          },
          // Alias the exact react-native package → react-native-web.
          {
            find: /^react-native$/,
            replacement: 'react-native-web',
          },
          // Stub out solito router and link — these wrap expo-router/next/react-navigation
          // which are not available in the Storybook web environment.
          {
            find: /^solito\/router$/,
            replacement: path.resolve(__dirname, './mocks/solito-router.js'),
          },
          {
            find: /^solito\/link$/,
            replacement: path.resolve(__dirname, './mocks/solito-link.js'),
          },
          // Stub out react-native-reanimated and moti — these are native
          // animation libraries that cannot run on web. @tamagui/animations-moti
          // imports them, but tamagui falls back to CSS transitions in browsers
          // so the actual native modules are never exercised.
          {
            find: /^react-native-reanimated$/,
            replacement: path.resolve(__dirname, './mocks/react-native-reanimated.js'),
          },
          {
            find: /^moti\/author$/,
            replacement: path.resolve(__dirname, './mocks/moti-author.js'),
          },
        ],
      },
      optimizeDeps: {
        // Force Vite to pre-bundle react-native-web and its CJS dependencies.
        // react-native-web's ESM dist imports inline-style-prefixer sub-paths
        // (e.g. lib/plugins/backgroundClip) as default imports, but those files
        // use exports.default (CJS/babel). Pre-bundling wraps them in proper ESM
        // so the browser doesn't get a "does not provide an export named default" error.
        // @react-native/normalize-colors has the same CJS issue.
        include: ['react-native-web', 'react-native-svg'],
        // These packages ship native-only code, Flow types, or JSX in .mjs
        // files that esbuild cannot process during pre-bundling.
        // Rollup (Vite's regular pipeline) handles them via resolve.alias.
        // Note: react-native-svg is NOT excluded here — its alias points to
        // ReactNativeSVG.web.js (plain CJS), which esbuild pre-bundles cleanly
        // and wraps into proper ESM so named exports like `Path` are available.
        exclude: [
          'react-native',
          'react-native-reanimated',
          'moti',
          'tamagui',
          ...tamaguiExcludes,
        ],
        esbuildOptions: {
          // React Native ecosystem packages ship JSX in plain .js AND .mjs
          // files. Tell esbuild to treat both as JSX so it doesn't choke on
          // `<Component ...>` syntax during pre-transform.
          loader: { '.js': 'jsx', '.mjs': 'jsx' },
          jsx: 'automatic',
          // Vite's resolve.alias only applies to bare specifiers BEFORE
          // pre-bundling. Once esbuild resolves an import to an absolute
          // filesystem path, the alias is never consulted again.
          // An esbuild plugin operates INSIDE the pre-bundler and redirects
          // the import while esbuild is still building the dep chunk, so the
          // ESM mock is inlined rather than the raw CJS file being referenced.
          plugins: [
            {
              name: 'normalize-colors-esm',
              setup(build: any) {
                const mockPath = path.resolve(__dirname, './mocks/normalize-colors.js');
                build.onResolve(
                  { filter: /^@react-native\/normalize-color[s]?$/ },
                  () => ({ path: mockPath }),
                );
              },
            },
          ],
        },
      },
      define: {
        'process.env': {},
      },
    });
  },
};

export default config;
