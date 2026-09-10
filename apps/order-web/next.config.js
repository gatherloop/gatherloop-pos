// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const { composePlugins, withNx } = require('@nx/next');
const { withTamagui } = require('@tamagui/next-plugin');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    svgr: false,
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: ['react-native-qrcode-svg'],
  experimental: {
    cpus: 1,
    workerThreads: false,
    reactCompiler: true,
  },
  webpack(config) {
    config.parallelism = 1;
    config.resolve.alias['react/compiler-runtime'] = require.resolve(
      'react-compiler-runtime'
    );
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_BASE_URL + '/:path*',
      },
    ];
  },
};

const tamaguiPlugin = withTamagui({
  config: './tamagui.config.ts',
  components: ['tamagui'],
  outputCSS:
    process.env.NODE_ENV === 'production' ? './public/tamagui.css' : null,
  disableExtraction: process.env.NODE_ENV === 'development',
});

const plugins = [
  withNx,
  tamaguiPlugin,
];

module.exports = composePlugins(...plugins)(nextConfig);
