const path = require('path');

module.exports = function (api) {
  api.cache(true);
  const src = path.resolve(__dirname, 'src');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'babel-plugin-module-resolver',
        {
          root: [src],
          alias: {
            '@': src,
            '@features': path.join(src, 'features'),
            '@repositories': path.join(src, 'data', 'repositories'),
            // Shared layers remain under `src/`; `@shared/foo` maps to `src/foo`.
            '@shared': src,
          },
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json', '.tsx', '.ts'],
        },
      ],
      // Required by Reanimated v2+ (must be last).
      'react-native-reanimated/plugin',
    ],
  };
};
