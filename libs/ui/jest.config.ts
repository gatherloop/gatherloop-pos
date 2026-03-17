/* eslint-disable */
export default {
  displayName: 'ui',
  preset: '../../jest.preset.js',
  coverageDirectory: '../../coverage/libs/ui',
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^@react-navigation/native$': '<rootDir>/src/__mocks__/@react-navigation/native.ts',
    '^next/router$': '<rootDir>/src/__mocks__/next/router.ts',
    '.*api-contract/src.*': '<rootDir>/src/__mocks__/api-contract.ts',
  },
  globals: {
    'ts-jest': {
      diagnostics: { warnOnly: true },
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation)/)',
  ],
};
