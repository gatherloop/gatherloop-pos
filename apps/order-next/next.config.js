//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
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
  // A stray apps/order-next/package-lock.json alongside the root lockfile
  // would make Next 15's output file tracing guess the wrong workspace
  // root. Pin it explicitly, as apps/web does.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // react-native-qrcode-svg ships untranspiled JSX (no prebuilt CJS output),
  // unlike react-native-svg which does — Next must run it through its own
  // loader instead of treating it as pre-built.
  transpilePackages: ['react-native-qrcode-svg'],
  // Mirrors apps/web's build posture (docs/trd-react-compiler-adoption.md):
  // Tamagui's static extraction walks the whole component tree at build
  // time, and Next's default multi-worker compilation multiplies that cost
  // by CPU count, so the build stays single-threaded.
  experimental: {
    cpus: 1,
    workerThreads: false,
    reactCompiler: true,
  },
  webpack(config) {
    config.parallelism = 1;
    // React 18 has no `react/compiler-runtime` subpath; the standalone runtime
    // package provides the identical `c()` implementation. Drops out when we
    // reach React 19 (see docs/trd-react-compiler-adoption.md §D3).
    config.resolve.alias['react/compiler-runtime'] = require.resolve(
      'react-compiler-runtime'
    );
    return config;
  },
  // D13 in docs/trd-order-app-nextjs-migration.md: the browser calls its own
  // origin (NEXT_PUBLIC_API_PROXY_BASE_URL=/api) and Next forwards
  // server-side, so there is no CORS and no per-cart-request preflight.
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
