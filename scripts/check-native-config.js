#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expectContains(relativePath, label, expected) {
  const contents = read(relativePath);

  if (!contents.includes(expected)) {
    failures.push(`${relativePath}: missing ${label} (${expected})`);
  }
}

function expectPattern(relativePath, label, pattern) {
  const contents = read(relativePath);

  if (!pattern.test(contents)) {
    failures.push(`${relativePath}: missing ${label}`);
  }
}

const { expo } = JSON.parse(read('app.json'));
const ios = expo.ios || {};
const android = expo.android || {};
const infoPlist = ios.infoPlist || {};
const appName = expo.name;
const scheme = expo.scheme;
const androidPackage = android.package;
const iosBundleId = ios.bundleIdentifier;
const iosStyle = expo.userInterfaceStyle === 'light' ? 'Light' : expo.userInterfaceStyle;

expectContains('android/settings.gradle', 'Gradle root project name', `rootProject.name = '${appName}'`);
expectContains('android/app/src/main/res/values/strings.xml', 'Android app name', `<string name="app_name">${appName}</string>`);
expectContains('android/app/build.gradle', 'Android namespace', `namespace '${androidPackage}'`);
expectContains('android/app/build.gradle', 'Android applicationId', `applicationId '${androidPackage}'`);
expectContains('android/app/src/main/AndroidManifest.xml', 'Android deep-link scheme', `<data android:scheme="${scheme}"/>`);

if (expo.orientation === 'portrait') {
  expectContains('android/app/src/main/AndroidManifest.xml', 'Android portrait lock', 'android:screenOrientation="portrait"');
  expectContains('ios/just20/Info.plist', 'iOS portrait orientation', '<string>UIInterfaceOrientationPortrait</string>');
}

for (const permission of android.permissions || []) {
  expectContains('android/app/src/main/AndroidManifest.xml', `Android permission ${permission}`, `android:name="${permission}"`);
}

expectContains('ios/just20/Info.plist', 'iOS display name', `<string>${appName}</string>`);
expectContains('ios/just20/Info.plist', 'iOS URL scheme', `<string>${scheme}</string>`);
expectContains('ios/just20/Info.plist', 'iOS bundle URL scheme', `<string>${iosBundleId}</string>`);
expectPattern(
  'ios/just20/Info.plist',
  'iOS user interface style',
  new RegExp(`<key>UIUserInterfaceStyle</key>\\s*<string>${escapeRegExp(iosStyle)}</string>`)
);
expectContains('ios/just20.xcodeproj/project.pbxproj', 'iOS bundle identifier', `PRODUCT_BUNDLE_IDENTIFIER = ${iosBundleId};`);
expectContains('ios/just20.xcodeproj/project.pbxproj', 'iOS product name', `PRODUCT_NAME = "${appName}";`);

for (const [key, value] of Object.entries(infoPlist)) {
  if (Array.isArray(value)) {
    for (const item of value) {
      expectContains('ios/just20/Info.plist', `iOS ${key} item`, `<string>${item}</string>`);
    }
    continue;
  }

  expectPattern(
    'ios/just20/Info.plist',
    `iOS ${key}`,
    new RegExp(`<key>${escapeRegExp(key)}</key>\\s*<string>${escapeRegExp(value)}</string>`)
  );
}

if (failures.length > 0) {
  console.error('Native config sync check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Native config matches app.json for identity, permissions, orientation, and URL schemes.');
