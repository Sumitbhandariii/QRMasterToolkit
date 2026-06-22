const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Packages that are native-only and must be stubbed on web.
const WEB_STUBS = {
  'react-native-google-mobile-ads': path.resolve(__dirname, 'stubs/react-native-google-mobile-ads.js'),
};

// expo-modules-core: under pnpm the nested copy at
//   .pnpm/node_modules/expo-modules-core
// has no build/ directory, causing bundling to fail on web.
// Point it to a safe stub so SSR/web rendering never hits the missing file.
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Stub native-only libs on web
  if (platform === 'web' && WEB_STUBS[moduleName]) {
    return { filePath: WEB_STUBS[moduleName], type: 'sourceFile' };
  }

  // Fix pnpm nested expo-modules-core missing build/ on web
  if (platform === 'web' && moduleName === 'expo-modules-core') {
    // Try to let Metro resolve it normally first; if it fails we'll catch below
    try {
      if (originalResolver) {
        return originalResolver(context, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    } catch (_) {
      return {
        filePath: path.resolve(__dirname, 'stubs/expo-modules-core.js'),
        type: 'sourceFile',
      };
    }
  }

  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
