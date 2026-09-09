const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
for (const ext of ['db', 'wasm']) {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
}

const previousEnhance = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware(middleware, server) {
    const nextMiddleware = previousEnhance ? previousEnhance(middleware, server) : middleware;
    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      return nextMiddleware(req, res, next);
    };
  },
};

module.exports = config;
