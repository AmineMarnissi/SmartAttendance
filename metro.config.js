const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const {assetExts} = defaultConfig.resolver;

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    assetExts: [...assetExts, 'tflite'],
    extraNodeModules: {
      crypto: require.resolve('./src/polyfills/crypto.js'),
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
