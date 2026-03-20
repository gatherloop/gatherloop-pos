import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

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
        // These packages ship native-only code, Flow types, or pull in
        // react-native-reanimated/moti chains that esbuild cannot process.
        // The resolve.alias entries and Rollup handle them correctly at
        // build time; esbuild pre-bundling should leave them alone.
        exclude: [
          'react-native',
          'react-native-svg',
          'react-native-reanimated',
          'moti',
          '@tamagui/animations-moti',
          '@tamagui/animations-react-native',
          '@tamagui/config',
          'tamagui',
          '@tamagui/core',
          '@tamagui/lucide-icons',
        ],
        esbuildOptions: {
          // Many React Native packages ship JSX in plain .js files (no .jsx
          // extension). Tell esbuild to treat every .js file as JSX so it
          // doesn't choke on `<Component ...>` syntax at pre-transform time.
          loader: { '.js': 'jsx' },
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
