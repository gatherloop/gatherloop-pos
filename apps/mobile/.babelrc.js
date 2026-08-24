// React Compiler must run before anything else lowers the source; the Reanimated
// plugin must stay last (its own requirement). Both hold simultaneously.
const reactCompiler = ['babel-plugin-react-compiler', { target: '18' }];

module.exports = function (api) {
  api.cache(true);

  if (
    process.env.NX_TASK_TARGET_TARGET === 'build' ||
    process.env.NX_TASK_TARGET_TARGET?.includes('storybook')
  ) {
    return {
      presets: [
        [
          '@nx/react/babel',
          {
            runtime: 'automatic',
          },
        ],
      ],
      plugins: [reactCompiler, 'react-native-reanimated/plugin'],
    };
  }

  return {
    presets: [
      ['module:@react-native/babel-preset', { useTransformReactJSX: true }],
    ],
    plugins: [reactCompiler, 'react-native-reanimated/plugin'],
  };
};
