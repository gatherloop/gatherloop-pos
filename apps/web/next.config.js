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
  // webpack: (config) => {
  //   config?.resolve?.plugins = [
  //     ...(config?.resolve?.plugins ?? []),
  //     new TsconfigPathsPlugin(),
  //   ]
  //   return config
  // }
};

const tamaguiPlugin = withTamagui({
  config: './tamagui.config.ts',
  components: ['tamagui'],
  appDir: true,
});

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
  tamaguiPlugin,
];

module.exports = composePlugins(...plugins)(nextConfig);
