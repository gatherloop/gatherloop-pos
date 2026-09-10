import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      strictMode: false,
    },
  },
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-webpack5-compiler-babel',
    {
      name: '@storybook/addon-react-native-web',
      options: {
        projectRoot: `${__dirname}/.rnw-addon-scope-none`,
        modulesToAlias: {
          '@react-native/normalize-colors$': require.resolve(
            './mocks/normalize-colors.js'
          ),
          '@react-native/normalize-color$': require.resolve(
            './mocks/normalize-colors.js'
          ),
          'react-native-svg$': require.resolve(
            'react-native-svg/lib/commonjs/ReactNativeSVG.web.js'
          ),
          'react-native/Libraries/Utilities/codegenNativeComponent$':
            require.resolve('./mocks/codegenNativeComponent.js'),
          'solito/router$': require.resolve('./mocks/solito-router.js'),
          'solito/link$': require.resolve('./mocks/solito-link.js'),
          'next/router$': require.resolve('./mocks/next-router.js'),
          'react-native-reanimated$': require.resolve(
            './mocks/react-native-reanimated.js'
          ),
          'moti/author$': require.resolve('./mocks/moti-author.js'),
        },
      },
    },
  ],
  babelDefault: async (babelConfig) => ({
    ...babelConfig,
    presets: [
      ...(babelConfig.presets ?? []),
      [
        require.resolve('@nx/react/babel'),
        {
          runtime: 'automatic',
          reactCompiler: { target: '18' },
        },
      ],
    ],
  }),
  webpackFinal: async (webpackConfig) => {
    webpackConfig.resolve ??= {};
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      'react/compiler-runtime': require.resolve('react-compiler-runtime'),
    };
    return webpackConfig;
  },
};

module.exports = config;
