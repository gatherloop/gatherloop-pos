/* eslint-disable */
export default {
  displayName: 'ui',
  preset: '../../jest.preset.js',
  coverageDirectory: '../../coverage/libs/ui',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'html'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^@react-navigation/native$': '<rootDir>/src/__mocks__/@react-navigation/native.ts',
    '^next/router$': '<rootDir>/src/__mocks__/next/router.ts',
    '.*api-contract/src.*': '<rootDir>/src/__mocks__/api-contract.ts',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx|html)$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.spec.json', diagnostics: { warnOnly: true } },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation)/)',
  ],
};
