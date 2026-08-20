module.exports = {
  displayName: 'mobile',
  preset: 'react-native',
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '\\.svg$': '@nx/react-native/plugins/jest/svg-mock',
  },
  // react-native-config ships ESM with no CJS entry point, so the default
  // "ignore all of node_modules" behavior leaves its `import` statement
  // untranspiled — anything pulling in libs/api-contract/src/client.ts
  // (which imports it) fails to parse without this exception.
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-config)/)',
  ],
  transform: {
    '^.+.(js|ts|tsx)$': [
      'babel-jest',
      {
        configFile: __dirname + '/.babelrc.js',
      },
    ],
    '^.+.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      'react-native/jest/assetFileTransformer.js'
    ),
  },
  coverageDirectory: '../../coverage/apps/mobile',
};
