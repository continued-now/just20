// Learn more https://docs.expo.io/guides/customizing-metro
process.env.EXPO_ROUTER_APP_ROOT = 'app';

const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow bundling .tflite model files
config.resolver.assetExts.push('tflite');

module.exports = config;
