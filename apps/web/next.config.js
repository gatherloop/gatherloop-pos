//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require('@nx/next');
const { withTamagui } = require('@tamagui/next-plugin');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    // Set this to true if you would like to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
  },
  // react-native-qrcode-svg ships untranspiled JSX (no prebuilt CJS output),
  // unlike react-native-svg which does — Next must run it through its own
  // loader instead of treating it as pre-built.
  transpilePackages: ['react-native-qrcode-svg'],
  // Tamagui's static extraction walks the whole component tree at build
  // time, and Next's default multi-worker compilation multiplies that cost
  // by CPU count — that combination is what was pushing the Render build
  // past its memory ceiling. Keeping the build single-threaded trades build
  // time for a much lower peak.
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  webpack(config) {
    config.parallelism = 1;
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
  // Add more Next.js plugins to this list if needed.
  withNx,
  tamaguiPlugin,
];

module.exports = composePlugins(...plugins)(nextConfig);
