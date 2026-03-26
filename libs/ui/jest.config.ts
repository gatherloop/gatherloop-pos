/* eslint-disable */
export default {
  displayName: 'ui',
  preset: '../../jest.preset.js',
  coverageDirectory: '../../coverage/libs/ui',
  maxWorkers: '50%',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'html'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/src/__mocks__/react-native.ts',
    '^@react-navigation/native$': '<rootDir>/src/__mocks__/@react-navigation/native.ts',
    '^next/router$': '<rootDir>/src/__mocks__/next/router.ts',
    '.*api-contract/src.*': '<rootDir>/src/__mocks__/api-contract.ts',
    '^tamagui$': '<rootDir>/src/__mocks__/tamagui.tsx',
    '^@tamagui/lucide-icons$': '<rootDir>/src/__mocks__/@tamagui/lucide-icons.tsx',
    '^solito/router$': '<rootDir>/src/__mocks__/solito/router.ts',
    '^solito/link$': '<rootDir>/src/__mocks__/solito/link.ts',
    '^solito$': '<rootDir>/src/__mocks__/solito.ts',
    '^react-markdown$': '<rootDir>/src/__mocks__/react-markdown.ts',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
          target: 'es2022',
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation)/)',
  ],
};
