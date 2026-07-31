module.exports = function (api) {
  api.cache.using(() => process.env.BABEL_ENV ?? process.env.NODE_ENV ?? 'development');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'babel-plugin-module-resolver',
        {
          // Relative aliases (not absolute paths) so Metro cache stays valid if the repo moves.
          alias: {
            '@': './src',
            '@features': './src/features',
            '@repositories': './src/data/repositories',
            '@shared': './src',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json'],
        },
      ],
      // Required by Reanimated v2+ (must be last).
      'react-native-reanimated/plugin',
    ],
  };
};
