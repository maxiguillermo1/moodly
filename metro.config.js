/**
 * Metro config — dev bundle graph tuning (tests/QA excluded from app graph).
 * @see https://docs.expo.dev/guides/customizing-metro/
 */
const crypto = require('crypto');
const path = require('path');
const { createRequire } = require('module');
const { getDefaultConfig } = require('expo/metro-config');

const expoRequire = createRequire(require.resolve('expo/package.json'));
const { FileStore } = expoRequire('@expo/metro-config/file-store');

const projectRoot = __dirname;
const { version: appVersion } = require('./package.json');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Invalidate transform cache when the project folder or app version changes
// (avoids stale absolute paths after renaming/moving the repo).
config.cacheVersion = crypto
  .createHash('md5')
  .update(projectRoot)
  .update(appVersion)
  .digest('hex')
  .slice(0, 12);

// Project-local Metro cache — faster warm starts than only $TMPDIR/metro-cache.
config.cacheStores = [
  new FileStore({ root: path.join(projectRoot, '.metro-cache') }),
];

// Keep Jest/soak tests and export scratch dirs out of the Expo dev bundle graph.
const devBlockList = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\/__tests__\//,
  /\/src\/qa\//,
  /\.tmp-expo-export(?:-dev)?\//,
];
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  ...devBlockList,
];

// Expo Go on device requests bundle URLs with encoded spaces when the repo path has spaces.
// Normalizing the request path avoids 404s / hung "Opening project" on physical phones.
const enhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, metroServer) => {
    const stack = enhanceMiddleware
      ? enhanceMiddleware(metroMiddleware, metroServer)
      : metroMiddleware;
    return (req, res, next) => {
      if (req.url?.includes('%')) {
        try {
          const parsed = new URL(req.url, 'http://metro.local');
          parsed.pathname = decodeURIComponent(parsed.pathname);
          req.url = parsed.pathname + parsed.search;
        } catch {
          // Keep the original URL if decoding fails.
        }
      }
      return stack(req, res, next);
    };
  },
};

module.exports = config;
