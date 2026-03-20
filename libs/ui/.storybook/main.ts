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
      define: {
        'process.env': {},
      },
    });
  },
};

export default config;
