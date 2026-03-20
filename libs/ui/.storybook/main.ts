import type { StorybookConfig } from '@storybook/react-vite';
import { tamaguiPlugin } from '@tamagui/vite-plugin';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  viteFinalOptions: {},
  async viteFinal(config) {
    const { mergeConfig } = await import('vite');

    return mergeConfig(config, {
      plugins: [
        tamaguiPlugin({
          components: ['tamagui'],
          config: '../src/config.ts',
        }),
      ],
      resolve: {
        alias: {
          'react-native': 'react-native-web',
          'react-native-svg': 'react-native-svg-web',
        },
      },
      define: {
        'process.env': {},
      },
    });
  },
};

export default config;
