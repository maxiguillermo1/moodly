module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required by Reanimated v2+ (must be last).
      'react-native-reanimated/plugin',
    ],
  };
};

