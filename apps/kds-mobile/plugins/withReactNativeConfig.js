const { withAppBuildGradle } = require('@expo/config-plugins');

// react-native-config has no Expo config plugin of its own; this mirrors the
// one manual step its README asks for on Android (iOS is out of scope until
// this app has an Apple Developer account — see phase 5 of
// docs/prd-kds-order-notifications.md).
const DOTENV_APPLY =
  'apply from: project(\':react-native-config\').projectDir.getPath() + "/dotenv.gradle"';

const withReactNativeConfig = (config) =>
  withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('dotenv.gradle')) {
      const lines = config.modResults.contents.split('\n');
      lines.splice(1, 0, DOTENV_APPLY);
      config.modResults.contents = lines.join('\n');
    }
    return config;
  });

module.exports = withReactNativeConfig;
