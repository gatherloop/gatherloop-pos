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
  framework: '@storybook/react-vite',
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
        ],
      },
      optimizeDeps: {
        // These packages ship native-only code, Flow types, or JSX in .mjs
        // files that esbuild cannot process during pre-bundling.
        // Rollup (Vite's regular pipeline) handles them via resolve.alias.
        exclude: [
          'react-native',
          'react-native-svg',
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
        },
      },
      define: {
        'process.env': {},
      },
    });
  },
};

export default config;
