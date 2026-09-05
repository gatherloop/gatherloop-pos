import type { StorybookConfig } from '@storybook/react-webpack5';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-webpack5',
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
    // Compiles our own .ts/.tsx sources with babel-loader (the webpack5
    // builder ships no JS/TS compiler of its own). `babelDefault` below
    // supplies the actual preset/plugin list, mirroring what
    // @vitejs/plugin-react's `babel` option did.
    '@storybook/addon-webpack5-compiler-babel',
    {
      name: '@storybook/addon-react-native-web',
      options: {
        // Point this addon's own babel-loader rule (which by default also
        // transpiles everything under `projectRoot`) at a directory that
        // holds no source, so it only ever touches the RN-ecosystem
        // node_modules packages it's meant for. Our own sources are already
        // compiled by @storybook/addon-webpack5-compiler-babel above —
        // running both over the same files would double-transpile them.
        projectRoot: `${__dirname}/.rnw-addon-scope-none`,
        modulesToAlias: {
          // @react-native/normalize-colors ships a plain CJS file (module.exports = fn).
          // We redirect to a hand-written ESM copy that uses `export default`.
          '@react-native/normalize-colors$': require.resolve(
            './mocks/normalize-colors.js'
          ),
          // @tamagui/normalize-css-color imports the SINGULAR form of the same package.
          // Both packages have identical content; the same ESM mock handles both.
          '@react-native/normalize-color$': require.resolve(
            './mocks/normalize-colors.js'
          ),
          // Redirect react-native-svg to its built-in web implementation
          // (ReactNativeSVG.web.js) which uses DOM SVG and has zero
          // fabric/TurboModule imports.
          'react-native-svg$': require.resolve(
            'react-native-svg/lib/commonjs/ReactNativeSVG.web.js'
          ),
          // Mock codegenNativeComponent — a Fabric/TurboModules native API
          // that react-native-svg's <Use> element pulls in. react-native-web
          // has no equivalent; a no-op stub is sufficient for web rendering.
          'react-native/Libraries/Utilities/codegenNativeComponent$':
            require.resolve('./mocks/codegenNativeComponent.js'),
          // Stub out solito router and link — these wrap expo-router/next/react-navigation
          // which are not available in the Storybook web environment.
          'solito/router$': require.resolve('./mocks/solito-router.js'),
          'solito/link$': require.resolve('./mocks/solito-link.js'),
          // Stub next/router too: libs/ui/src/utils/queryParam.ts calls it directly
          // (outside the solito/router port). The real module drags Next's
          // server/build-only internals (Node core modules like zlib) into the
          // browser bundle; Storybook has no real Next app/router context anyway.
          'next/router$': require.resolve('./mocks/next-router.js'),
          // Stub out react-native-reanimated and moti — these are native
          // animation libraries that cannot run on web. @tamagui/animations-moti
          // imports them, but tamagui falls back to CSS transitions in browsers
          // so the actual native modules are never exercised.
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
          // Same react-compiler-runtime / target combination as apps/mobile's
          // Metro build (apps/mobile/.babelrc.js) and apps/web's Next build
          // (next.config.js) — see docs/trd-react-compiler-adoption.md §D3.
          reactCompiler: { target: '18' },
        },
      ],
    ],
  }),
  webpackFinal: async (webpackConfig) => {
    webpackConfig.resolve ??= {};
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      // React 18 has no `react/compiler-runtime` subpath; the standalone runtime
      // package provides the identical `c()` implementation. Drops out when we
      // reach React 19 (see docs/trd-react-compiler-adoption.md §D3).
      'react/compiler-runtime': require.resolve('react-compiler-runtime'),
    };
    return webpackConfig;
  },
};

module.exports = config;
